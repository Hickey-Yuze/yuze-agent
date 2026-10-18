// ==UserScript==
// @name         深大课表组合器
// @namespace    https://github.com/szu-scheduler
// @version      4.1.0
// @description  分栏目扫描深大选课系统，分类选择必选/可选课程并生成无冲突课表
// @match        http://bkxk.szu.edu.cn/xsxkapp/*
// @match        https://bkxk.szu.edu.cn/xsxkapp/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const PREFIX = 'szu-scheduler-v41';
  const STORAGE_KEY = 'szu_scheduler_v41';
  const LOG = '[SZU-Scheduler]';

  const CONFIG = Object.freeze({
    MAX_WEEKS: 25,
    MAX_PERIODS: 14,
    TOP_K: 10,
    SOLVER_TIMEOUT_MS: 8000,
    PAGE_TIMEOUT_MS: 10000,
    EXPAND_TIMEOUT_MS: 10000,
    TAB_DELAY_MS: 700,
    PAGE_DELAY_MS: 350,
    COURSE_DELAY_MS: 260,
    WEEKDAYS: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    COLORS: ['#4f46e5', '#0284c7', '#059669', '#ca8a04', '#dc2626', '#9333ea', '#ea580c', '#475569'],
  });

  const Utils = {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    waitFor(check, timeout = 5000, interval = 100) {
      return new Promise(resolve => {
        const startedAt = Date.now();
        const timer = setInterval(() => {
          let value = false;
          try {
            value = check();
          } catch (_) {
            value = false;
          }

          if (value) {
            clearInterval(timer);
            resolve(value);
            return;
          }

          if (Date.now() - startedAt >= timeout) {
            clearInterval(timer);
            resolve(false);
          }
        }, interval);
      });
    },

    text(value) {
      return String(value ?? '').replace(/\s+/g, ' ').trim();
    },

    number(value, fallback = 0) {
      const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : fallback;
    },

    escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    },

    normalizeName(value) {
      return String(value ?? '')
        .replace(/\[冲突\]/g, '')
        .replace(/【冲突】/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
    },

    hash(value) {
      let result = 0;
      const text = String(value ?? '');
      for (let index = 0; index < text.length; index += 1) {
        result = ((result << 5) - result + text.charCodeAt(index)) | 0;
      }
      return Math.abs(result);
    },
  };

  const Store = {
    data: null,

    defaults() {
      return { selections: {} };
    },

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this.data = raw ? { ...this.defaults(), ...JSON.parse(raw) } : this.defaults();
      } catch (error) {
        console.warn(LOG, '读取本地设置失败，已恢复默认值。', error);
        this.data = this.defaults();
      }

      if (!this.data.selections) {
        this.data.selections = {};
      }
      return this.data;
    },

    save() {
      if (!this.data) {
        this.load();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    },

    getSelection(courseKey) {
      if (!this.data) {
        this.load();
      }
      return this.data.selections[courseKey] || { status: 'excluded', priority: 3 };
    },

    setSelection(courseKey, status, priority) {
      if (!this.data) {
        this.load();
      }
      const current = this.getSelection(courseKey);
      this.data.selections[courseKey] = {
        status,
        priority: Number(priority ?? current.priority ?? 3),
      };
      this.save();
    },
  };

  const ScheduleParser = {
    weekdayMap: { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 },

    buildWeeks(startWeek, endWeek, oddEven = '') {
      const weeks = [];
      for (let week = startWeek; week <= endWeek && week <= CONFIG.MAX_WEEKS; week += 1) {
        if (oddEven === '单' && week % 2 === 0) continue;
        if (oddEven === '双' && week % 2 === 1) continue;
        weeks.push(week);
      }
      return weeks;
    },

    parse(rawText) {
      const source = Utils.text(rawText)
        .replace(/[（(]\s*单周\s*[）)]/g, ' 单周 ')
        .replace(/[（(]\s*双周\s*[）)]/g, ' 双周 ')
        .replace(/[；;]/g, ' ');

      if (!source) return [];

      const schedules = [];
      const pattern = /(?:第)?(\d{1,2})(?:\s*[-~—－至]\s*(\d{1,2}))?\s*周\s*(?:(单|双)周?\s*)?星期([一二三四五六日天])\s*(?:第)?(\d{1,2})(?:\s*[-~—－至]\s*(\d{1,2}))?\s*节\s*([^；;]*?)(?=\s*(?:第)?\d{1,2}(?:\s*[-~—－至]\s*\d{1,2})?\s*周|$)/g;

      let match;
      while ((match = pattern.exec(source)) !== null) {
        const startWeek = Number(match[1]);
        const endWeek = Number(match[2] || match[1]);
        const oddEven = match[3] || '';
        const weekday = this.weekdayMap[match[4]];
        const startPeriod = Number(match[5]);
        const endPeriod = Number(match[6] || match[5]);
        const location = Utils.text(match[7]).replace(/\s*无选课说明.*$/, '');

        if (!weekday || startWeek < 1 || endWeek < startWeek || startPeriod < 1 || endPeriod < startPeriod) {
          continue;
        }

        schedules.push({
          weekday,
          startPeriod,
          endPeriod: Math.min(endPeriod, CONFIG.MAX_PERIODS),
          weeks: this.buildWeeks(startWeek, endWeek, oddEven),
          location,
          raw: Utils.text(match[0]),
        });
      }

      return schedules;
    },

    format(schedule) {
      const day = CONFIG.WEEKDAYS[(schedule.weekday || 1) - 1] || `周${schedule.weekday}`;
      const periods = schedule.startPeriod === schedule.endPeriod
        ? `${schedule.startPeriod}节`
        : `${schedule.startPeriod}-${schedule.endPeriod}节`;

      const weeks = schedule.weeks || [];
      let weekText = '';
      if (weeks.length) {
        const minWeek = Math.min(...weeks);
        const maxWeek = Math.max(...weeks);
        const oddOnly = weeks.every(week => week % 2 === 1);
        const evenOnly = weeks.every(week => week % 2 === 0);
        weekText = `${minWeek}-${maxWeek}周`;
        if (oddOnly) weekText += '单周';
        else if (evenOnly) weekText += '双周';
      }

      return [weekText, day, periods, schedule.location || ''].filter(Boolean).join(' ');
    },
  };

  const Adapter = {
    TAB_DEFINITIONS: [
      { id: 'aRecommendCourse', key: 'recommend', name: '本班课程', mode: 'grouped' },
      { id: 'aProgramCourse', key: 'program', name: '方案内课程', mode: 'grouped' },
      { id: 'aUnProgramCourse', key: 'unprogram', name: '方案外课程', mode: 'grouped' },
      { id: 'aPublicCourse', key: 'public', name: '校公选课', mode: 'direct' },
      { id: 'aSportCourse', key: 'sport', name: '体育课程', mode: 'grouped' },
    ],

    getAvailableTabs() {
      return this.TAB_DEFINITIONS.map(definition => {
        const tabElement = document.getElementById(definition.id);
        if (!tabElement) return null;

        const selector = tabElement.getAttribute('href');
        const articleElement = selector ? document.querySelector(selector) : null;
        if (!articleElement) return null;

        return { ...definition, tabElement, articleElement };
      }).filter(Boolean);
    },

    getTabByKey(tabKey) {
      return this.getAvailableTabs().find(item => item.key === tabKey) || null;
    },

    getCurrentTab() {
      const activeElement = document.querySelector('#cvPageHeadTab li.cv-active [cv-role="tab"]');
      if (!activeElement) return null;
      return this.getAvailableTabs().find(item => item.tabElement === activeElement) || null;
    },

    isVisible(element) {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    },

    isStillOnSelectionPage() {
      return Boolean(document.querySelector('#cvPageHeadTab') && document.querySelector('#cvExpertMode'));
    },

    click(element) {
      element?.click();
    },

    async activateTab(tabItem) {
      if (!this.isStillOnSelectionPage()) {
        throw new Error('当前已经离开选课页面，请重新登录后再试。');
      }

      const tabListItem = tabItem.tabElement.closest('li');
      if (tabListItem?.classList.contains('cv-active') && this.isVisible(tabItem.articleElement)) {
        await Utils.sleep(180);
        return true;
      }

      this.click(tabItem.tabElement);

      const activated = await Utils.waitFor(() => {
        if (!this.isStillOnSelectionPage()) return false;
        return Boolean(
          tabItem.tabElement.closest('li')?.classList.contains('cv-active') &&
          this.isVisible(tabItem.articleElement)
        );
      }, CONFIG.PAGE_TIMEOUT_MS, 100);

      if (!this.isStillOnSelectionPage()) {
        throw new Error(`切换到“${tabItem.name}”时页面退出，请重新登录后只扫描该栏目。`);
      }

      if (!activated) return false;

      await Utils.waitFor(() => Boolean(
        tabItem.articleElement.querySelector('.cv-body, .cv-row, .cv-foot')
      ), CONFIG.PAGE_TIMEOUT_MS, 100);

      await Utils.sleep(CONFIG.TAB_DELAY_MS);
      return true;
    },

    getPane(articleElement) {
      if (!articleElement) return null;
      const panes = [...articleElement.querySelectorAll('.cv-tab-pane')];
      return (
        panes.find(pane => pane.classList.contains('cv-active') && pane.querySelector('.cv-body > .cv-row')) ||
        panes.find(pane => pane.classList.contains('cv-active') && pane.querySelector('.cv-body')) ||
        panes.find(pane => this.isVisible(pane) && pane.querySelector('.cv-body > .cv-row')) ||
        panes.find(pane => pane.querySelector('.cv-body > .cv-row')) ||
        panes.find(pane => pane.querySelector('.cv-body')) ||
        articleElement
      );
    },

    getRows(pane) {
      return pane ? [...pane.querySelectorAll('.cv-body > .cv-row')] : [];
    },

    getPagination(pane) {
      const foot = pane?.querySelector('.cv-foot') || pane?.closest('article')?.querySelector('.cv-foot');
      if (!foot) return { current: 1, total: 1, up: null, down: null };

      const text = Utils.text(foot.textContent);
      const currentMatch = text.match(/当前第\s*(\d+)\s*页/);
      const totalMatch = text.match(/共\s*(\d+)\s*页/);
      const links = [...foot.querySelectorAll('a')];

      return {
        current: currentMatch ? Number(currentMatch[1]) : 1,
        total: totalMatch ? Number(totalMatch[1]) : 1,
        up: links.find(link => Utils.text(link.textContent) === '上一页') || null,
        down: links.find(link => Utils.text(link.textContent) === '下一页') || null,
      };
    },

    getPageSignature(pane) {
      const pagination = this.getPagination(pane);
      const rows = this.getRows(pane);
      const first = rows[0]?.getAttribute('coursenumber') || rows[0]?.querySelector('.cv-number-col')?.getAttribute('title') || '';
      const last = rows.at(-1)?.getAttribute('coursenumber') || rows.at(-1)?.querySelector('.cv-number-col')?.getAttribute('title') || '';
      return [pagination.current, rows.length, first, last].join('|');
    },

    async goToPage(pane, targetPage) {
      let pagination = this.getPagination(pane);
      if (pagination.current === targetPage) return true;

      while (pagination.current !== targetPage) {
        const movingBack = pagination.current > targetPage;
        const button = movingBack ? pagination.up : pagination.down;
        if (!button) return false;

        const expectedPage = pagination.current + (movingBack ? -1 : 1);
        const oldSignature = this.getPageSignature(pane);
        this.click(button);

        const changed = await Utils.waitFor(() => {
          const currentPagination = this.getPagination(pane);
          const currentSignature = this.getPageSignature(pane);
          return currentPagination.current === expectedPage || currentSignature !== oldSignature;
        }, CONFIG.PAGE_TIMEOUT_MS, 100);

        if (!changed) return false;
        pagination = this.getPagination(pane);
        await Utils.sleep(CONFIG.PAGE_DELAY_MS);
      }

      return true;
    },

    makeCourseKey(courseTotalNumber, courseNumber, courseName) {
      if (courseTotalNumber) return `TOTAL:${courseTotalNumber}`;
      if (courseNumber) return `NUM:${courseNumber}`;
      return `NAME:${Utils.normalizeName(courseName)}`;
    },

    parseGroupedCourseRow(row, tabItem, pageNumber) {
      const courseNumber = row.getAttribute('coursenumber') || Utils.text(row.querySelector('.cv-num')?.childNodes?.[0]?.textContent);
      const courseTotalNumber = Utils.text(row.querySelector('.cv-courseTotalNumber')?.textContent);
      const courseName = Utils.text(row.querySelector('.cv-course')?.textContent);
      if (!courseName) return null;

      const courseKey = this.makeCourseKey(courseTotalNumber, courseNumber, courseName);
      const reference = {
        key: `${tabItem.key}|${pageNumber}|${courseNumber}`,
        tabKey: tabItem.key,
        tabName: tabItem.name,
        page: pageNumber,
        courseNumber,
        mode: 'grouped',
      };

      return {
        courseKey,
        courseNumber,
        courseTotalNumber,
        courseCode: courseTotalNumber || courseNumber || courseName,
        courseName,
        credit: Utils.number(row.querySelector('.cv-credit-col')?.textContent),
        category: Utils.text(row.querySelector('.cv-type')?.textContent),
        nature: Utils.text(row.querySelector('.cv-nature')?.textContent),
        department: Utils.text(row.querySelector('.cv-department-col')?.textContent),
        sourceTabs: [tabItem.name],
        sourceRefs: [reference],
        loadedRefKeys: [],
        sections: [],
      };
    },

    parseDirectPublicRow(row, tabItem, pageNumber) {
      const numberCell = row.querySelector('.cv-number-col');
      const choice = row.querySelector('.cv-choice[tcid]');

      const displayNumber = Utils.text(numberCell?.getAttribute('title')) || Utils.text(numberCell?.querySelector('.cv-detail')?.textContent);
      const courseNumber = choice?.getAttribute('number') || numberCell?.querySelector('.cv-detail')?.getAttribute('data-num') || displayNumber.replace(/\[.*$/, '');
      const courseIndex = displayNumber.match(/\[([^\]]+)\]/)?.[1] || '';
      const courseTotalNumber = Utils.text(row.querySelector('.cv-courseTotalNumber')?.textContent);
      const rawName = Utils.text(row.querySelector('.cv-title-col')?.textContent);
      const courseName = rawName.replace(/\[冲突\]/g, '').replace(/【冲突】/g, '').trim();
      if (!courseName) return null;

      const scheduleTexts = [...row.querySelectorAll('.cv-time-col [title]')]
        .map(element => element.getAttribute('title'))
        .filter(value => /周.*星期.*节/.test(value || ''));

      const scheduleSource = scheduleTexts.length
        ? scheduleTexts.join(' ')
        : Utils.text(row.querySelector('.cv-time-col')?.textContent);

      const schedules = ScheduleParser.parse(scheduleSource);
      const sectionId = choice?.getAttribute('tcid') || `${courseNumber}-${courseIndex || pageNumber}`;
      const courseKey = this.makeCourseKey(courseTotalNumber, courseNumber, courseName);

      const section = {
        sectionId,
        courseIndex,
        teacher: Utils.text(row.querySelector('.cv-teacher-col')?.textContent),
        schedules,
        location: schedules.map(schedule => schedule.location).filter(Boolean).join('；'),
        capacity: Utils.number(row.querySelector('.cv-capcity-col')?.textContent),
        selectedCount: Utils.number(row.querySelector('.cv-selected-col')?.textContent),
        firstVolunteerCount: Utils.number(row.querySelector('.cv-firstVolunteer-col')?.textContent),
        canSelect: choice?.getAttribute('canselect') === '1',
        isFull: choice?.getAttribute('isfull') === '1',
        isConflict: choice?.getAttribute('isconflict') === '1',
        hasTest: choice?.getAttribute('hastest') === '1',
        validSchedule: schedules.length > 0,
        sourceTab: tabItem.name,
      };

      return {
        courseKey,
        courseNumber,
        courseTotalNumber,
        courseCode: courseTotalNumber || courseNumber || courseName,
        courseName,
        credit: Utils.number(row.querySelector('.cv-credit-col')?.textContent),
        category: Utils.text(row.querySelector('.cv-type-col')?.textContent),
        nature: '选修',
        department: '',
        sourceTabs: [tabItem.name],
        sourceRefs: [],
        loadedRefKeys: [],
        sections: [section],
      };
    },

    mergeCourseCollections(existingCourses, newCourses) {
      const map = new Map();

      const addCourse = course => {
        if (!map.has(course.courseKey)) {
          map.set(course.courseKey, {
            ...course,
            sourceTabs: [...(course.sourceTabs || [])],
            sourceRefs: [...(course.sourceRefs || [])],
            loadedRefKeys: [...(course.loadedRefKeys || [])],
            sections: [...(course.sections || [])],
          });
          return;
        }

        const existing = map.get(course.courseKey);
        existing.sourceTabs = [...new Set([...(existing.sourceTabs || []), ...(course.sourceTabs || [])])];

        const refMap = new Map();
        for (const ref of [...(existing.sourceRefs || []), ...(course.sourceRefs || [])]) {
          refMap.set(ref.key, ref);
        }
        existing.sourceRefs = [...refMap.values()];
        existing.loadedRefKeys = [...new Set([...(existing.loadedRefKeys || []), ...(course.loadedRefKeys || [])])];

        const sectionMap = new Map();
        for (const section of [...(existing.sections || []), ...(course.sections || [])]) {
          sectionMap.set(section.sectionId, section);
        }
        existing.sections = [...sectionMap.values()];

        if (!existing.credit && course.credit) existing.credit = course.credit;
        if (!existing.courseTotalNumber && course.courseTotalNumber) existing.courseTotalNumber = course.courseTotalNumber;
        if (!existing.courseNumber && course.courseNumber) existing.courseNumber = course.courseNumber;
      };

      for (const course of existingCourses || []) addCourse(course);
      for (const course of newCourses || []) addCourse(course);

      return [...map.values()].sort((left, right) => left.courseName.localeCompare(right.courseName, 'zh-CN'));
    },

    async scanOneTab(tabItem, onProgress) {
      const activated = await this.activateTab(tabItem);
      if (!activated) throw new Error(`无法打开“${tabItem.name}”。`);

      const pane = this.getPane(tabItem.articleElement);
      if (!pane) throw new Error(`“${tabItem.name}”没有找到课程列表。`);

      const originalPage = this.getPagination(pane).current;
      await this.goToPage(pane, 1);
      const totalPages = this.getPagination(pane).total;
      const result = [];

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        if (this.getPagination(pane).current !== pageNumber) {
          const moved = await this.goToPage(pane, pageNumber);
          if (!moved) throw new Error(`“${tabItem.name}”无法进入第${pageNumber}页。`);
        }

        const rows = this.getRows(pane);
        onProgress?.({
          tabName: tabItem.name,
          page: pageNumber,
          totalPages,
          rows: rows.length,
          mode: tabItem.mode,
        });

        for (const row of rows) {
          const course = tabItem.mode === 'direct'
            ? this.parseDirectPublicRow(row, tabItem, pageNumber)
            : this.parseGroupedCourseRow(row, tabItem, pageNumber);
          if (course) result.push(course);
        }

        await Utils.sleep(CONFIG.PAGE_DELAY_MS);
      }

      if (originalPage !== this.getPagination(pane).current) {
        await this.goToPage(pane, originalPage).catch(() => false);
      }

      return this.mergeCourseCollections([], result);
    },

    async scanSelectedTabs(tabKeys, onProgress) {
      const originalTab = this.getCurrentTab();
      let originalPage = 1;

      if (originalTab) {
        const originalPane = this.getPane(originalTab.articleElement);
        if (originalPane) originalPage = this.getPagination(originalPane).current;
      }

      const allCourses = [];
      for (let index = 0; index < tabKeys.length; index += 1) {
        const tabItem = this.getTabByKey(tabKeys[index]);
        if (!tabItem) continue;

        onProgress?.({
          stage: 'tab',
          tabIndex: index + 1,
          totalTabs: tabKeys.length,
          tabName: tabItem.name,
          page: 0,
          totalPages: 0,
          rows: 0,
          mode: tabItem.mode,
        });

        const tabCourses = await this.scanOneTab(tabItem, progress => {
          onProgress?.({
            stage: 'page',
            tabIndex: index + 1,
            totalTabs: tabKeys.length,
            ...progress,
          });
        });

        allCourses.push(...tabCourses);
      }

      if (originalTab && this.isStillOnSelectionPage()) {
        await this.activateTab(originalTab).catch(() => false);
        const originalPane = this.getPane(originalTab.articleElement);
        if (originalPane) {
          await this.goToPage(originalPane, originalPage).catch(() => false);
        }
      }

      return this.mergeCourseCollections([], allCourses);
    },

    parseGroupedSectionCard(card, course, index) {
      const titleElement = card.querySelector('.cv-info-title');
      const titleText = Utils.text(titleElement?.getAttribute('title') || titleElement?.textContent);
      const teacherMatch = titleText.match(/^\[([^\]]+)]\s*(.*)$/);
      const courseIndex = teacherMatch ? teacherMatch[1] : '';
      const teacher = teacherMatch ? teacherMatch[2] : titleText;
      const chooseButton = card.querySelector('.cv-btn-chose[tcid]');
      const deleteButton = card.querySelector('.cv-delete-volunteer[tcid]');
      const sectionId = chooseButton?.getAttribute('tcid') || deleteButton?.getAttribute('tcid') || `${course.courseNumber}-${courseIndex || index + 1}`;

      const scheduleTitles = [...card.querySelectorAll('.cv-info [title]')]
        .map(element => element.getAttribute('title'))
        .filter(value => /周.*星期.*节/.test(value || ''));

      const scheduleSource = scheduleTitles.length
        ? scheduleTitles.join(' ')
        : Utils.text(card.querySelector('.cv-info')?.textContent);

      const schedules = ScheduleParser.parse(scheduleSource);
      const cardText = Utils.text(card.textContent);

      return {
        sectionId,
        courseIndex,
        teacher,
        schedules,
        location: schedules.map(schedule => schedule.location).filter(Boolean).join('；'),
        capacity: Utils.number(cardText.match(/课容量[：:]\s*(\d+)/)?.[1]),
        firstVolunteerCount: Utils.number(cardText.match(/已报第一志愿[：:]\s*(\d+)/)?.[1]),
        selectedCount: Utils.number(cardText.match(/已选中人数[：:]\s*(\d+)/)?.[1]),
        canSelect: card.getAttribute('canselect') === '1',
        isChosen: card.getAttribute('ischoose') === '1',
        isFull: card.getAttribute('isfull') === '1',
        isConflict: card.getAttribute('isconflict') === '1',
        hasTest: chooseButton?.getAttribute('hastest') === '1',
        validSchedule: schedules.length > 0,
      };
    },

    async expandCourseRow(row) {
      if (row.classList.contains('cv-expand') && row.querySelector('.cv-course-card')) return true;
      const courseNameElement = row.querySelector('.cv-course');
      if (!courseNameElement) return false;
      this.click(courseNameElement);
      return Boolean(await Utils.waitFor(() =>
        row.classList.contains('cv-expand') && row.querySelector('.cv-course-card'),
      CONFIG.EXPAND_TIMEOUT_MS, 100));
    },

    async collapseCourseRow(row) {
      if (!row.classList.contains('cv-expand')) return;
      const courseNameElement = row.querySelector('.cv-course');
      if (!courseNameElement) return;
      this.click(courseNameElement);
      await Utils.waitFor(() => !row.classList.contains('cv-expand'), 3000, 100);
    },

    findGroupedCourseRow(pane, courseNumber) {
      return this.getRows(pane).find(row => row.getAttribute('coursenumber') === courseNumber) || null;
    },

    async loadCourseSections(course, onProgress) {
      const loadedKeys = new Set(course.loadedRefKeys || []);
      const refs = (course.sourceRefs || []).filter(ref => !loadedKeys.has(ref.key));
      if (!refs.length) return course;

      const sectionMap = new Map((course.sections || []).map(section => [section.sectionId, section]));

      for (let refIndex = 0; refIndex < refs.length; refIndex += 1) {
        const ref = refs[refIndex];
        const tabItem = this.getTabByKey(ref.tabKey);
        if (!tabItem || tabItem.mode !== 'grouped') continue;

        onProgress?.({
          courseName: course.courseName,
          tabName: tabItem.name,
          referenceIndex: refIndex + 1,
          totalReferences: refs.length,
        });

        try {
          const activated = await this.activateTab(tabItem);
          if (!activated) continue;

          const pane = this.getPane(tabItem.articleElement);
          if (!pane) continue;

          const moved = await this.goToPage(pane, ref.page);
          if (!moved) continue;

          const row = this.findGroupedCourseRow(pane, ref.courseNumber);
          if (!row) continue;

          const expanded = await this.expandCourseRow(row);
          if (!expanded) continue;

          const cards = [...row.querySelectorAll('.cv-course-card')];
          for (let index = 0; index < cards.length; index += 1) {
            const section = this.parseGroupedSectionCard(cards[index], course, index);
            sectionMap.set(section.sectionId, section);
          }

          await this.collapseCourseRow(row);
          loadedKeys.add(ref.key);
          await Utils.sleep(CONFIG.COURSE_DELAY_MS);
        } catch (error) {
          console.warn(LOG, `读取“${course.courseName}”教学班失败。`, error);
        }
      }

      course.sections = [...sectionMap.values()];
      course.loadedRefKeys = [...loadedKeys];
      return course;
    },
  };

  const WORKER_CODE = String.raw`
'use strict';

const MAX_WEEKS = 25;
const MAX_PERIODS = 14;
const SLOT_COUNT = 7 * MAX_PERIODS;

function emptyBitmap() {
  return Array.from({ length: SLOT_COUNT }, () => 0n);
}

function slotIndex(day, period) {
  return (day - 1) * MAX_PERIODS + period - 1;
}

function validSchedule(schedule) {
  return Boolean(
    schedule &&
    Number.isInteger(schedule.weekday) &&
    schedule.weekday >= 1 &&
    schedule.weekday <= 7 &&
    Number.isInteger(schedule.startPeriod) &&
    Number.isInteger(schedule.endPeriod) &&
    schedule.startPeriod >= 1 &&
    schedule.endPeriod <= MAX_PERIODS &&
    schedule.startPeriod <= schedule.endPeriod &&
    Array.isArray(schedule.weeks) &&
    schedule.weeks.length > 0
  );
}

function validSection(section) {
  return Boolean(
    section &&
    Array.isArray(section.schedules) &&
    section.schedules.length > 0 &&
    section.schedules.every(validSchedule)
  );
}

function hasConflict(bitmap, section) {
  if (!validSection(section)) return true;

  for (const schedule of section.schedules) {
    for (let period = schedule.startPeriod; period <= schedule.endPeriod; period += 1) {
      const index = slotIndex(schedule.weekday, period);
      for (const week of schedule.weeks) {
        if (
          week >= 1 &&
          week <= MAX_WEEKS &&
          (bitmap[index] & (1n << BigInt(week - 1))) !== 0n
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

function addSection(bitmap, section) {
  const next = bitmap.slice();

  for (const schedule of section.schedules) {
    for (let period = schedule.startPeriod; period <= schedule.endPeriod; period += 1) {
      const index = slotIndex(schedule.weekday, period);
      for (const week of schedule.weeks) {
        if (week >= 1 && week <= MAX_WEEKS) {
          next[index] |= 1n << BigInt(week - 1);
        }
      }
    }
  }

  return next;
}

function computeStats(selected) {
  let totalCredit = 0;
  let priorityScore = 0;
  let optionalCount = 0;
  const activeDays = new Set();
  const periodsByWeekDay = new Map();

  for (const item of selected) {
    totalCredit += Number(item.credit || 0);
    if (item.isOptional) {
      priorityScore += Number(item.priority || 0);
      optionalCount += 1;
    }

    for (const schedule of item.schedules || []) {
      activeDays.add(schedule.weekday);
      for (const week of schedule.weeks) {
        const key = week + '-' + schedule.weekday;
        if (!periodsByWeekDay.has(key)) periodsByWeekDay.set(key, new Set());
        const periods = periodsByWeekDay.get(key);
        for (let period = schedule.startPeriod; period <= schedule.endPeriod; period += 1) {
          periods.add(period);
        }
      }
    }
  }

  let gapCount = 0;
  for (const periods of periodsByWeekDay.values()) {
    const values = [...periods].sort((left, right) => left - right);
    if (values.length > 1) {
      gapCount += values[values.length - 1] - values[0] + 1 - values.length;
    }
  }

  return {
    totalCredit,
    priorityScore,
    optionalCount,
    activeDays: activeDays.size,
    gapCount,
  };
}

function compareSolutions(left, right) {
  return (
    right.priorityScore - left.priorityScore ||
    right.optionalCount - left.optionalCount ||
    left.gapCount - right.gapCount ||
    left.activeDays - right.activeDays ||
    left.signature.localeCompare(right.signature)
  );
}

function solve(input, emit) {
  const topK = Math.max(1, Math.min(20, Number(input.topK || 10)));
  const timeoutMs = Math.max(500, Number(input.timeoutMs || 8000));
  const startedAt = Date.now();
  let nodeCount = 0;
  let timedOut = false;
  const results = [];

  const required = (input.requiredCourses || [])
    .map(course => ({ ...course, sections: (course.sections || []).filter(validSection) }))
    .sort((left, right) => left.sections.length - right.sections.length);

  const optional = (input.optionalCourses || [])
    .map(course => ({
      ...course,
      priority: Number(course.priority || 1),
      sections: (course.sections || []).filter(validSection),
    }))
    .filter(course => course.sections.length)
    .sort((left, right) => right.priority - left.priority || left.sections.length - right.sections.length);

  const missingRequired = required.filter(course => !course.sections.length);
  if (missingRequired.length) {
    return {
      success: false,
      results: [],
      diagnosis: missingRequired.map(course => course.courseName + '没有可用且时间完整的教学班。'),
    };
  }

  const remainingScore = new Array(optional.length + 1).fill(0);
  const remainingCount = new Array(optional.length + 1).fill(0);
  for (let index = optional.length - 1; index >= 0; index -= 1) {
    remainingScore[index] = remainingScore[index + 1] + optional[index].priority;
    remainingCount[index] = remainingCount[index + 1] + 1;
  }

  function shouldStop() {
    if (Date.now() - startedAt > timeoutMs) {
      timedOut = true;
      return true;
    }
    return false;
  }

  function createItem(course, section, isOptional) {
    return {
      sectionId: section.sectionId,
      courseCode: course.courseCode,
      courseKey: course.courseKey,
      courseName: course.courseName,
      teacher: section.teacher,
      courseIndex: section.courseIndex,
      location: section.location,
      credit: course.credit,
      isOptional,
      priority: isOptional ? course.priority : 0,
      schedules: section.schedules,
    };
  }

  function saveSolution(selected) {
    const stats = computeStats(selected);
    const signature = selected
      .map(item => item.courseCode + '=' + item.sectionId)
      .sort()
      .join('|');

    if (results.some(result => result.signature === signature)) return;

    const selectedKeys = new Set(selected.map(item => item.courseKey || item.courseCode));
    results.push({
      ...stats,
      signature,
      selectedDetails: selected.slice(),
      omittedOptional: optional
        .filter(course => !selectedKeys.has(course.courseKey || course.courseCode))
        .map(course => ({ courseCode: course.courseCode, courseName: course.courseName })),
    });

    results.sort(compareSolutions);
    if (results.length > topK) results.pop();
  }

  function shouldPruneOptional(index, currentScore, currentCount) {
    if (results.length < topK) return false;
    const worst = results[results.length - 1];
    const bestPossibleScore = currentScore + remainingScore[index];
    if (bestPossibleScore < worst.priorityScore) return true;
    return (
      bestPossibleScore === worst.priorityScore &&
      currentCount + remainingCount[index] < worst.optionalCount
    );
  }

  function searchOptional(index, bitmap, selected, currentScore, currentCount) {
    nodeCount += 1;

    if ((nodeCount & 255) === 0) {
      if (shouldStop()) return false;
      emit?.({ nodeCount, foundCount: results.length, elapsed: Date.now() - startedAt });
    }

    if (shouldPruneOptional(index, currentScore, currentCount)) return true;
    if (index >= optional.length) {
      saveSolution(selected);
      return true;
    }

    const course = optional[index];
    for (const section of course.sections) {
      if (hasConflict(bitmap, section)) continue;
      selected.push(createItem(course, section, true));
      const success = searchOptional(
        index + 1,
        addSection(bitmap, section),
        selected,
        currentScore + course.priority,
        currentCount + 1
      );
      selected.pop();
      if (!success) return false;
    }

    return searchOptional(index + 1, bitmap, selected, currentScore, currentCount);
  }

  function searchRequired(index, bitmap, selected) {
    nodeCount += 1;

    if ((nodeCount & 255) === 0) {
      if (shouldStop()) return false;
      emit?.({ nodeCount, foundCount: results.length, elapsed: Date.now() - startedAt });
    }

    if (index >= required.length) {
      return searchOptional(0, bitmap, selected, 0, 0);
    }

    const course = required[index];
    for (const section of course.sections) {
      if (hasConflict(bitmap, section)) continue;
      selected.push(createItem(course, section, false));
      const success = searchRequired(index + 1, addSection(bitmap, section), selected);
      selected.pop();
      if (!success) return false;
    }

    return true;
  }

  searchRequired(0, emptyBitmap(), []);

  if (!results.length) {
    return {
      success: false,
      results: [],
      diagnosis: ['没有找到同时满足全部必选课程的无冲突方案。'],
      nodeCount,
      elapsed: Date.now() - startedAt,
      timedOut,
    };
  }

  return {
    success: true,
    results,
    nodeCount,
    elapsed: Date.now() - startedAt,
    timedOut,
  };
}

self.onmessage = event => {
  if (event.data?.type !== 'solve') return;
  const result = solve(event.data.payload, progress => {
    self.postMessage({ type: 'progress', progress });
  });
  self.postMessage({ type: 'result', result });
};
`;

  const Solver = {
    worker: null,

    stop() {
      this.worker?.terminate();
      this.worker = null;
    },

    run(payload, onProgress, onComplete) {
      this.stop();
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      URL.revokeObjectURL(url);
      this.worker = worker;

      worker.onmessage = event => {
        if (event.data?.type === 'progress') onProgress?.(event.data.progress);
        if (event.data?.type === 'result') {
          this.stop();
          onComplete?.(event.data.result);
        }
      };

      worker.onerror = error => {
        console.error(LOG, '求解器运行失败。', error);
        this.stop();
        onComplete?.({
          success: false,
          results: [],
          diagnosis: ['求解器运行失败，请刷新页面后重试。'],
        });
      };

      worker.postMessage({ type: 'solve', payload });
    },
  };

  const UI = {
    panel: null,
    body: null,
    view: 'scan',
    activeCategory: 'all',
    courses: [],
    scannedTabKeys: new Set(),
    results: [],
    resultIndex: 0,
    solverMeta: null,
    cancelledLoading: false,

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
#${PREFIX}-panel{position:fixed;top:55px;right:16px;width:500px;max-height:88vh;background:#fff;border:1px solid #d8dee8;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.16);z-index:2147483647;color:#1f2937;overflow:hidden;display:flex;flex-direction:column;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#${PREFIX}-panel.minimized{max-height:44px}
#${PREFIX}-panel.minimized main{display:none}
#${PREFIX}-panel>header{height:44px;padding:0 12px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;color:#fff;background:linear-gradient(135deg,#4f46e5,#7c3aed);cursor:move;user-select:none}
#${PREFIX}-panel>header button{width:26px;height:26px;border:none;border-radius:6px;color:#fff;background:rgba(255,255,255,.16);cursor:pointer}
#${PREFIX}-body{padding:12px;max-height:calc(88vh - 44px);overflow:auto}
.${PREFIX}-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.${PREFIX}-grow{flex:1}
.${PREFIX}-btn{padding:7px 11px;border:1px solid #d1d5db;border-radius:8px;background:#f8fafc;color:#334155;font-size:12px;cursor:pointer}
.${PREFIX}-btn.primary{border-color:#4f46e5;background:#4f46e5;color:#fff}
.${PREFIX}-btn.danger{border-color:#fecaca;color:#b91c1c;background:#fff}
.${PREFIX}-btn:disabled{opacity:.5;cursor:not-allowed}
.${PREFIX}-card{margin:8px 0;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff}
.${PREFIX}-muted{color:#64748b;font-size:11px}
.${PREFIX}-error{border-color:#ef4444;background:#fef2f2}
.${PREFIX}-tab-option{display:flex;align-items:center;gap:8px;margin:7px 0;padding:8px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer}
.${PREFIX}-tab-option:hover{background:#f8fafc}
.${PREFIX}-tab-option.scanned{border-color:#a7f3d0;background:#ecfdf5}
.${PREFIX}-badge{padding:2px 7px;border-radius:999px;background:#e2e8f0;color:#475569;font-size:10px}
.${PREFIX}-badge.done{color:#047857;background:#d1fae5}
.${PREFIX}-category-bar{display:flex;gap:6px;margin:9px 0;padding-bottom:3px;overflow-x:auto}
.${PREFIX}-category-btn{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:1px solid #d1d5db;border-radius:999px;background:#fff;color:#475569;font-size:12px;cursor:pointer}
.${PREFIX}-category-btn:hover{border-color:#818cf8;background:#f5f3ff}
.${PREFIX}-category-btn.active{border-color:#4f46e5;background:#4f46e5;color:#fff}
.${PREFIX}-category-count{min-width:17px;padding:0 4px;border-radius:999px;background:rgba(148,163,184,.18);text-align:center;font-size:10px}
.${PREFIX}-category-btn.active .${PREFIX}-category-count{background:rgba(255,255,255,.22)}
#${PREFIX}-search{width:100%;box-sizing:border-box;margin:8px 0;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px}
.${PREFIX}-course{margin:7px 0;overflow:hidden;border:1px solid #e5e7eb;border-left:4px solid #cbd5e1;border-radius:9px}
.${PREFIX}-course.required{border-left-color:#dc2626}
.${PREFIX}-course.optional{border-left-color:#2563eb}
.${PREFIX}-course.excluded{opacity:.72}
.${PREFIX}-course-head{display:flex;align-items:center;gap:8px;padding:9px;background:#f8fafc;cursor:pointer}
.${PREFIX}-course-title{font-weight:650}
.${PREFIX}-course-meta{color:#64748b;font-size:11px}
.${PREFIX}-course-actions{display:flex;align-items:center;gap:4px;margin-left:auto}
.${PREFIX}-status{padding:3px 8px;border:1px solid #d1d5db;border-radius:999px;background:#fff;font-size:11px;cursor:pointer}
.${PREFIX}-status.required{color:#fff;border-color:#dc2626;background:#dc2626}
.${PREFIX}-status.optional{color:#fff;border-color:#2563eb;background:#2563eb}
.${PREFIX}-status.excluded{background:#e5e7eb}
.${PREFIX}-priority{padding:3px 5px;border:1px solid #93c5fd;border-radius:6px}
.${PREFIX}-course-detail{display:none;padding:9px;border-top:1px solid #e5e7eb}
.${PREFIX}-course-detail.open{display:block}
.${PREFIX}-section{margin:4px 0;padding:6px;border-radius:7px;background:#f8fafc}
.${PREFIX}-stats{display:flex;flex-wrap:wrap;gap:6px}
.${PREFIX}-stat{padding:3px 8px;border-radius:999px;background:#eef2ff;font-size:11px}
.${PREFIX}-tt-wrap{margin-top:10px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px}
.${PREFIX}-tt{width:100%;min-width:780px;border-collapse:collapse;font-size:10px}
.${PREFIX}-tt th,.${PREFIX}-tt td{padding:3px;border:1px solid #e5e7eb;vertical-align:top}
.${PREFIX}-tt th{background:#f8fafc}
.${PREFIX}-tt td{height:30px}
.${PREFIX}-tt-block{display:flex;flex-direction:column;margin:1px;padding:3px;border-left:3px solid;border-radius:4px}
.${PREFIX}-tt-block span,.${PREFIX}-tt-block small{color:#64748b}
.${PREFIX}-hidden{display:none!important}
      `;
      document.head.appendChild(style);
    },

    init() {
      if (document.getElementById(`${PREFIX}-panel`)) return;
      this.injectStyles();
      Store.load();

      this.panel = document.createElement('section');
      this.panel.id = `${PREFIX}-panel`;
      this.panel.innerHTML = `
        <header id="${PREFIX}-drag">
          <b>📚 深大课表组合器</b>
          <button id="${PREFIX}-min">−</button>
        </header>
        <main id="${PREFIX}-body"></main>
      `;
      document.body.appendChild(this.panel);
      this.body = document.getElementById(`${PREFIX}-body`);

      document.getElementById(`${PREFIX}-min`).onclick = () => {
        this.panel.classList.toggle('minimized');
        document.getElementById(`${PREFIX}-min`).textContent = this.panel.classList.contains('minimized') ? '+' : '−';
      };

      this.makeDraggable();
      this.render();
    },

    makeDraggable() {
      const header = document.getElementById(`${PREFIX}-drag`);
      let active = false;
      let offsetX = 0;
      let offsetY = 0;

      header.addEventListener('mousedown', event => {
        if (event.target.closest('button')) return;
        active = true;
        offsetX = event.clientX - this.panel.offsetLeft;
        offsetY = event.clientY - this.panel.offsetTop;
      });

      document.addEventListener('mousemove', event => {
        if (!active) return;
        this.panel.style.left = `${Math.max(0, Math.min(innerWidth - this.panel.offsetWidth, event.clientX - offsetX))}px`;
        this.panel.style.top = `${Math.max(0, Math.min(innerHeight - this.panel.offsetHeight, event.clientY - offsetY))}px`;
        this.panel.style.right = 'auto';
      });

      document.addEventListener('mouseup', () => {
        active = false;
      });
    },

    render() {
      if (this.view === 'scan') this.renderScanView();
      else if (this.view === 'select') this.renderSelectView();
      else this.renderResultView();
    },

    renderScanView() {
      const tabs = Adapter.getAvailableTabs();
      this.body.innerHTML = `
        <div class="${PREFIX}-row">
          <h3 style="margin:0">选择需要扫描的栏目</h3>
          ${this.courses.length ? `
            <span class="${PREFIX}-grow"></span>
            <button class="${PREFIX}-btn" id="${PREFIX}-return-select">返回课程选择</button>
          ` : ''}
        </div>

        <div class="${PREFIX}-card ${PREFIX}-muted">
          可以先扫描一部分，之后再继续添加。校公选课会直接读取每一行教学班。
        </div>

        <div id="${PREFIX}-tab-options">
          ${tabs.map(tab => {
            const scanned = this.scannedTabKeys.has(tab.key);
            return `
              <label class="${PREFIX}-tab-option ${scanned ? 'scanned' : ''}">
                <input type="checkbox" value="${tab.key}" ${scanned ? '' : 'checked'}>
                <b>${Utils.escapeHtml(tab.name)}</b>
                <span class="${PREFIX}-grow"></span>
                <span class="${PREFIX}-badge ${scanned ? 'done' : ''}">
                  ${scanned ? '已扫描' : tab.mode === 'direct' ? '直接读取教学班' : '未扫描'}
                </span>
              </label>
            `;
          }).join('')}
        </div>

        <div class="${PREFIX}-row">
          <button class="${PREFIX}-btn" id="${PREFIX}-select-all">全选</button>
          <button class="${PREFIX}-btn" id="${PREFIX}-clear-tabs">清空</button>
          <span class="${PREFIX}-grow"></span>
          <button class="${PREFIX}-btn primary" id="${PREFIX}-scan">${this.courses.length ? '扫描并添加' : '开始扫描'}</button>
        </div>

        <div class="${PREFIX}-card" id="${PREFIX}-scan-status">
          ${this.courses.length ? `当前已经收集 ${this.courses.length} 门课程。` : '准备就绪。'}
        </div>
      `;

      const optionContainer = document.getElementById(`${PREFIX}-tab-options`);
      document.getElementById(`${PREFIX}-select-all`).onclick = () => {
        optionContainer.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = true; });
      };
      document.getElementById(`${PREFIX}-clear-tabs`).onclick = () => {
        optionContainer.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
      };
      document.getElementById(`${PREFIX}-scan`).onclick = () => this.scanSelectedTabs();
      document.getElementById(`${PREFIX}-return-select`)?.addEventListener('click', () => {
        this.view = 'select';
        this.render();
      });
    },

    setScanStatus(html, error = false) {
      const element = document.getElementById(`${PREFIX}-scan-status`);
      if (!element) return;
      element.className = `${PREFIX}-card ${error ? `${PREFIX}-error` : ''}`;
      element.innerHTML = html;
    },

    async scanSelectedTabs() {
      const selectedKeys = [...document.querySelectorAll(`#${PREFIX}-tab-options input[type="checkbox"]:checked`)].map(input => input.value);
      if (!selectedKeys.length) {
        alert('请至少选择一个需要扫描的栏目。');
        return;
      }

      const scanButton = document.getElementById(`${PREFIX}-scan`);
      scanButton.disabled = true;

      try {
        const newlyScannedCourses = await Adapter.scanSelectedTabs(selectedKeys, progress => {
          if (progress.stage === 'tab') {
            this.setScanStatus(`正在切换到栏目 ${progress.tabIndex}/${progress.totalTabs}：<b>${Utils.escapeHtml(progress.tabName)}</b>`);
          } else {
            const modeText = progress.mode === 'direct' ? '直接读取教学班' : '读取课程列表';
            this.setScanStatus(
              `正在扫描 ${progress.tabIndex}/${progress.totalTabs}：<b>${Utils.escapeHtml(progress.tabName)}</b>` +
              `<br>第 ${progress.page}/${progress.totalPages} 页，本页 ${progress.rows} 行（${modeText}）`
            );
          }
        });

        this.courses = Adapter.mergeCourseCollections(this.courses, newlyScannedCourses);
        selectedKeys.forEach(key => this.scannedTabKeys.add(key));
        if (!this.courses.length) throw new Error('没有读取到任何课程。');

        this.view = 'select';
        this.render();
      } catch (error) {
        console.error(LOG, error);
        this.setScanStatus(
          `扫描失败：${Utils.escapeHtml(error.message)}` +
          `<br><span class="${PREFIX}-muted">请确认仍在选课页面，必要时重新登录后只勾选一个栏目重试。</span>`,
          true
        );
      } finally {
        scanButton.disabled = false;
      }
    },

    getCourseCategories() {
      return [
        { key: 'all', label: '全部', sourceName: null },
        { key: 'recommend', label: '本班课程', sourceName: '本班课程' },
        { key: 'program', label: '方案内课程', sourceName: '方案内课程' },
        { key: 'unprogram', label: '方案外课程', sourceName: '方案外课程' },
        { key: 'public', label: '校公选课', sourceName: '校公选课' },
        { key: 'sport', label: '体育课', sourceName: '体育课程' },
      ];
    },

    getCategoryCourseCount(category) {
      if (category.key === 'all') return this.courses.length;
      return this.courses.filter(course => (course.sourceTabs || []).includes(category.sourceName)).length;
    },

    getVisibleCategoryCourses() {
      const category = this.getCourseCategories().find(item => item.key === this.activeCategory);
      if (!category || category.key === 'all') return this.courses;
      return this.courses.filter(course => (course.sourceTabs || []).includes(category.sourceName));
    },

    courseHtml(course) {
      const selection = Store.getSelection(course.courseKey);
      const validSectionCount = (course.sections || []).filter(section => section.validSchedule).length;
      const unresolvedRefs = (course.sourceRefs || []).filter(ref => !(course.loadedRefKeys || []).includes(ref.key)).length;

      let detailsHtml = '';
      if (!(course.sections || []).length && unresolvedRefs > 0) {
        detailsHtml = `<span class="${PREFIX}-muted">教学班信息将在生成课表时读取。</span>`;
      } else if (!(course.sections || []).length) {
        detailsHtml = '<span style="color:#b91c1c">没有读取到教学班。</span>';
      } else {
        detailsHtml = course.sections.map(section => {
          const schedules = section.schedules.length
            ? section.schedules.map(ScheduleParser.format).map(Utils.escapeHtml).join('；')
            : '<span style="color:#b91c1c">时间无法识别</span>';

          const flags = [
            section.isFull ? '已满' : '',
            section.isConflict ? '当前与已选课冲突' : '',
            section.hasTest ? '含实验安排，请核对' : '',
          ].filter(Boolean).join(' · ');

          return `
            <div class="${PREFIX}-section">
              <b>${Utils.escapeHtml(section.courseIndex ? `[${section.courseIndex}]` : '')}${Utils.escapeHtml(section.teacher || '教师未知')}</b>
              · ${Utils.escapeHtml(section.sectionId)}
              <br>${schedules}
              ${flags ? `<br><span class="${PREFIX}-muted">${Utils.escapeHtml(flags)}</span>` : ''}
            </div>
          `;
        }).join('');
      }

      return `
        <article
          class="${PREFIX}-course ${selection.status}"
          data-key="${Utils.escapeHtml(course.courseKey)}"
          data-search="${Utils.escapeHtml(`${course.courseName} ${course.courseNumber} ${course.courseTotalNumber}`.toLowerCase())}"
        >
          <div class="${PREFIX}-course-head">
            <div>
              <div class="${PREFIX}-course-title">${Utils.escapeHtml(course.courseName)}</div>
              <div class="${PREFIX}-course-meta">
                ${Utils.escapeHtml(course.courseTotalNumber || course.courseNumber || '')}
                · ${course.credit}学分
                ${(course.sections || []).length ? ` · ${validSectionCount}个可计算教学班` : ''}
                <br>来源：${Utils.escapeHtml((course.sourceTabs || []).join('、'))}
              </div>
            </div>

            <div class="${PREFIX}-course-actions">
              <button class="${PREFIX}-status ${selection.status === 'required' ? 'required' : ''}" data-status="required">必选</button>
              <button class="${PREFIX}-status ${selection.status === 'optional' ? 'optional' : ''}" data-status="optional">可选</button>
              <button class="${PREFIX}-status ${selection.status === 'excluded' ? 'excluded' : ''}" data-status="excluded">不选</button>
              ${selection.status === 'optional' ? `
                <select class="${PREFIX}-priority" data-role="priority">
                  ${[1, 2, 3, 4, 5].map(value => `
                    <option value="${value}" ${value === selection.priority ? 'selected' : ''}>${value}</option>
                  `).join('')}
                </select>
              ` : ''}
            </div>
          </div>

          <div class="${PREFIX}-course-detail">${detailsHtml}</div>
        </article>
      `;
    },

    renderSelectView() {
      const requiredCount = this.courses.filter(course => Store.getSelection(course.courseKey).status === 'required').length;
      const optionalCount = this.courses.filter(course => Store.getSelection(course.courseKey).status === 'optional').length;
      const categories = this.getCourseCategories();
      const currentCategory = categories.find(item => item.key === this.activeCategory);

      if (!currentCategory || (this.activeCategory !== 'all' && this.getCategoryCourseCount(currentCategory) === 0)) {
        this.activeCategory = 'all';
      }

      const visibleCourses = this.getVisibleCategoryCourses();

      this.body.innerHTML = `
        <div class="${PREFIX}-row">
          <h3 style="margin:0">选择课程</h3>
          <span class="${PREFIX}-grow"></span>
          <button class="${PREFIX}-btn" id="${PREFIX}-add-tabs">继续添加栏目</button>
        </div>

        <div class="${PREFIX}-card ${PREFIX}-muted">
          共 ${this.courses.length} 门课程。必选 ${requiredCount} 门，可选 ${optionalCount} 门。可选优先级数字越大越优先。
        </div>

        <div class="${PREFIX}-category-bar">
          ${categories.map(category => `
            <button
              class="${PREFIX}-category-btn ${this.activeCategory === category.key ? 'active' : ''}"
              data-category="${category.key}"
            >
              <span>${Utils.escapeHtml(category.label)}</span>
              <span class="${PREFIX}-category-count">${this.getCategoryCourseCount(category)}</span>
            </button>
          `).join('')}
        </div>

        <input id="${PREFIX}-search" placeholder="在当前分类中搜索课程名称或课程号">

        <div id="${PREFIX}-course-list">
          ${visibleCourses.length
            ? visibleCourses.map(course => this.courseHtml(course)).join('')
            : `<div class="${PREFIX}-card ${PREFIX}-muted">当前分类还没有课程，可以点击“继续添加栏目”进行扫描。</div>`}
        </div>

        <div class="${PREFIX}-row">
          <button class="${PREFIX}-btn danger" id="${PREFIX}-clear-courses">清空本次课程</button>
          <span class="${PREFIX}-grow"></span>
          <button class="${PREFIX}-btn primary" id="${PREFIX}-solve">生成课表</button>
        </div>
      `;

      const list = document.getElementById(`${PREFIX}-course-list`);

      this.body.querySelectorAll('[data-category]').forEach(button => {
        button.addEventListener('click', () => {
          this.activeCategory = button.dataset.category;
          this.renderSelectView();
        });
      });

      document.getElementById(`${PREFIX}-search`).oninput = event => {
        const keyword = event.target.value.toLowerCase().trim();
        list.querySelectorAll(`.${PREFIX}-course`).forEach(item => {
          item.classList.toggle(`${PREFIX}-hidden`, !item.dataset.search.includes(keyword));
        });
      };

      list.onclick = event => {
        const item = event.target.closest(`.${PREFIX}-course`);
        if (!item) return;

        const courseKey = item.dataset.key;
        const statusButton = event.target.closest('[data-status]');

        if (statusButton) {
          event.stopPropagation();
          Store.setSelection(courseKey, statusButton.dataset.status, Store.getSelection(courseKey).priority);
          const course = this.courses.find(current => current.courseKey === courseKey);
          item.outerHTML = this.courseHtml(course);
          return;
        }

        if (!event.target.closest(`.${PREFIX}-course-actions`)) {
          item.querySelector(`.${PREFIX}-course-detail`)?.classList.toggle('open');
        }
      };

      list.onchange = event => {
        if (!event.target.matches('[data-role="priority"]')) return;
        const item = event.target.closest(`.${PREFIX}-course`);
        Store.setSelection(item.dataset.key, 'optional', Number(event.target.value));
      };

      document.getElementById(`${PREFIX}-add-tabs`).onclick = () => {
        this.view = 'scan';
        this.render();
      };

      document.getElementById(`${PREFIX}-clear-courses`).onclick = () => {
        if (!confirm('确定清空本次已经扫描的全部课程吗？')) return;
        this.courses = [];
        this.scannedTabKeys.clear();
        this.results = [];
        this.activeCategory = 'all';
        this.view = 'scan';
        this.render();
      };

      document.getElementById(`${PREFIX}-solve`).onclick = () => this.prepareAndSolve();
    },

    async prepareAndSolve() {
      const selectedCourses = this.courses.filter(course => Store.getSelection(course.courseKey).status !== 'excluded');
      if (!selectedCourses.length) {
        alert('请至少将一门课程标记为“必选”或“可选”。');
        return;
      }

      this.cancelledLoading = false;
      this.body.innerHTML = `
        <div style="text-align:center;padding:28px">
          <div style="font-size:38px">📖</div>
          <div class="${PREFIX}-card">
            正在读取所选课程的教师和时间……<br>
            <span class="${PREFIX}-muted" id="${PREFIX}-load-progress">准备中</span>
          </div>
          <button class="${PREFIX}-btn" id="${PREFIX}-cancel-loading">返回</button>
        </div>
      `;

      document.getElementById(`${PREFIX}-cancel-loading`).onclick = () => {
        this.cancelledLoading = true;
        this.view = 'select';
        this.render();
      };

      try {
        for (let index = 0; index < selectedCourses.length; index += 1) {
          if (this.cancelledLoading) return;
          const course = selectedCourses[index];
          const progressElement = document.getElementById(`${PREFIX}-load-progress`);
          if (progressElement) progressElement.textContent = `${index + 1}/${selectedCourses.length} ${course.courseName}`;
          await Adapter.loadCourseSections(course);
          await Utils.sleep(CONFIG.COURSE_DELAY_MS);
        }
      } catch (error) {
        console.error(LOG, error);
        alert(`读取教学班失败：${error.message}`);
        this.view = 'select';
        this.render();
        return;
      }

      if (this.cancelledLoading) return;

      const requiredCourses = [];
      const optionalCourses = [];

      for (const course of selectedCourses) {
        const selection = Store.getSelection(course.courseKey);
        const validSections = (course.sections || []).filter(section => section.validSchedule);
        const normalized = { ...course, sections: validSections };

        if (selection.status === 'required') requiredCourses.push(normalized);
        else if (selection.status === 'optional') optionalCourses.push({ ...normalized, priority: selection.priority });
      }

      const invalidRequired = requiredCourses.filter(course => !course.sections.length);
      if (invalidRequired.length) {
        alert('以下必选课程没有读取到可计算的教学班：\n' + invalidRequired.map(course => course.courseName).join('\n'));
        this.view = 'select';
        this.render();
        return;
      }

      this.runSolver(requiredCourses, optionalCourses);
    },

    runSolver(requiredCourses, optionalCourses) {
      this.body.innerHTML = `
        <div style="text-align:center;padding:28px">
          <div style="font-size:38px">⚙️</div>
          <div class="${PREFIX}-card">
            正在生成课表……<br>
            <span class="${PREFIX}-muted" id="${PREFIX}-solver-progress">准备中</span>
          </div>
          <button class="${PREFIX}-btn" id="${PREFIX}-cancel-solver">取消</button>
        </div>
      `;

      document.getElementById(`${PREFIX}-cancel-solver`).onclick = () => {
        Solver.stop();
        this.view = 'select';
        this.render();
      };

      Solver.run(
        { requiredCourses, optionalCourses, topK: CONFIG.TOP_K, timeoutMs: CONFIG.SOLVER_TIMEOUT_MS },
        progress => {
          const element = document.getElementById(`${PREFIX}-solver-progress`);
          if (element) {
            element.textContent = `搜索节点 ${progress.nodeCount.toLocaleString()} · 已找到 ${progress.foundCount} 套 · ${(progress.elapsed / 1000).toFixed(1)} 秒`;
          }
        },
        result => {
          this.results = result.results || [];
          this.resultIndex = 0;
          this.solverMeta = result;
          this.view = 'result';
          this.render();
        }
      );
    },

    renderTimetable(selectedDetails) {
      const cells = new Map();
      for (const item of selectedDetails || []) {
        for (const schedule of item.schedules || []) {
          const key = `${schedule.startPeriod}-${schedule.weekday}`;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push({ ...item, schedule });
        }
      }

      let html = `
        <div class="${PREFIX}-tt-wrap">
          <table class="${PREFIX}-tt">
            <thead><tr><th>节次</th>${CONFIG.WEEKDAYS.map(day => `<th>${day}</th>`).join('')}</tr></thead>
            <tbody>
      `;

      for (let period = 1; period <= CONFIG.MAX_PERIODS; period += 1) {
        html += `<tr><th>${period}</th>`;
        for (let day = 1; day <= 7; day += 1) {
          html += '<td>';
          const items = cells.get(`${period}-${day}`) || [];
          for (const item of items) {
            const color = CONFIG.COLORS[Utils.hash(item.courseCode) % CONFIG.COLORS.length];
            html += `
              <div class="${PREFIX}-tt-block" style="border-left-color:${color};background:${color}14">
                <b>${Utils.escapeHtml(item.courseName)}</b>
                <span>${Utils.escapeHtml(item.courseIndex ? `[${item.courseIndex}]` : '')}${Utils.escapeHtml(item.teacher || '')}</span>
                <small>${Utils.escapeHtml(ScheduleParser.format(item.schedule))}</small>
              </div>
            `;
          }
          html += '</td>';
        }
        html += '</tr>';
      }

      html += '</tbody></table></div>';
      return html;
    },

    renderResultView() {
      if (!this.solverMeta?.success || !this.results.length) {
        const diagnosis = this.solverMeta?.diagnosis?.length ? this.solverMeta.diagnosis : ['没有找到可行方案。'];
        this.body.innerHTML = `
          <div class="${PREFIX}-row">
            <h3 style="margin:0">没有可行方案</h3>
            <span class="${PREFIX}-grow"></span>
            <button class="${PREFIX}-btn" id="${PREFIX}-back-select">返回修改</button>
          </div>
          <div class="${PREFIX}-card ${PREFIX}-error">
            <ul>${diagnosis.map(message => `<li>${Utils.escapeHtml(message)}</li>`).join('')}</ul>
          </div>
        `;
        document.getElementById(`${PREFIX}-back-select`).onclick = () => {
          this.view = 'select';
          this.render();
        };
        return;
      }

      const solution = this.results[this.resultIndex];
      this.body.innerHTML = `
        <div class="${PREFIX}-row">
          <h3 style="margin:0">方案 ${this.resultIndex + 1}/${this.results.length}</h3>
          <span class="${PREFIX}-grow"></span>
          <button class="${PREFIX}-btn" id="${PREFIX}-back-select">返回选择</button>
        </div>

        <div class="${PREFIX}-card">
          <div class="${PREFIX}-stats">
            <span class="${PREFIX}-stat">总学分 ${solution.totalCredit}</span>
            <span class="${PREFIX}-stat">可选 ${solution.optionalCount}门</span>
            <span class="${PREFIX}-stat">优先级 ${solution.priorityScore}</span>
            <span class="${PREFIX}-stat">空堂 ${solution.gapCount}</span>
            <span class="${PREFIX}-stat">上课 ${solution.activeDays}天</span>
            ${this.solverMeta.timedOut ? `<span class="${PREFIX}-stat">已达到计算时限</span>` : ''}
          </div>

          <div style="margin-top:8px">
            ${solution.selectedDetails.map(item => `
              <div class="${PREFIX}-section">
                <b>${Utils.escapeHtml(item.courseName)}</b>
                · ${Utils.escapeHtml(item.courseIndex ? `[${item.courseIndex}]` : '')}${Utils.escapeHtml(item.teacher || '')}
                · ${Utils.escapeHtml(item.sectionId)} · ${item.credit}学分
              </div>
            `).join('')}
          </div>

          ${solution.omittedOptional.length ? `
            <div class="${PREFIX}-muted" style="margin-top:8px">
              未加入可选课：${solution.omittedOptional.map(item => Utils.escapeHtml(item.courseName)).join('、')}
            </div>
          ` : ''}
        </div>

        ${this.renderTimetable(solution.selectedDetails)}

        <div class="${PREFIX}-row" style="margin-top:10px">
          <button class="${PREFIX}-btn" id="${PREFIX}-previous" ${this.resultIndex === 0 ? 'disabled' : ''}>上一套</button>
          <button class="${PREFIX}-btn" id="${PREFIX}-next" ${this.resultIndex === this.results.length - 1 ? 'disabled' : ''}>下一套</button>
          <span class="${PREFIX}-grow"></span>
          <button class="${PREFIX}-btn primary" id="${PREFIX}-copy">复制教学班号</button>
        </div>
      `;

      document.getElementById(`${PREFIX}-back-select`).onclick = () => {
        this.view = 'select';
        this.render();
      };
      document.getElementById(`${PREFIX}-previous`).onclick = () => {
        if (this.resultIndex > 0) {
          this.resultIndex -= 1;
          this.render();
        }
      };
      document.getElementById(`${PREFIX}-next`).onclick = () => {
        if (this.resultIndex < this.results.length - 1) {
          this.resultIndex += 1;
          this.render();
        }
      };
      document.getElementById(`${PREFIX}-copy`).onclick = () => {
        const text = solution.selectedDetails.map(item => `${item.courseName}\t${item.sectionId}`).join('\n');
        navigator.clipboard?.writeText(text).then(() => {
          alert('教学班号已复制。');
        }).catch(() => {
          prompt('请手动复制：', text);
        });
      };
    },
  };

  function start() {
    console.log(LOG, 'V4.1.0 启动。');
    UI.init();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();