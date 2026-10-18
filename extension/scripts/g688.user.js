// ==UserScript==
// @name         简历填写助手 v4（最全副本+本地匹配）
// @namespace    https://catpaw.local/resume-fill-assistant/v4
// @version      4.3.2
// @description  解析简历生成最全副本存本地，双击字段本地匹配+AI兜底，一次解析全部奏效，绝不自动提交。
// @author       时代少年团
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    ROOT_ID: 'tabbit-resume-fill-assistant',
    PROFILE_KEY: 'tabbit-resume-fill-assistant:profile:v2',
    PROFILE_VERSION_KEY: 'tabbit-resume-fill-assistant:profile-version:v2',
    PAGE_PLAN_PREFIX: 'tabbit-resume-fill-assistant:page-plan:v4:',
    MAX_PROFILE: 12000,
    MAX_CONTEXT: 7000,
    MAX_FORM_HTML: 40000,
    MAX_IMPORT_IMAGE_BYTES: 2 * 1024 * 1024,
    MAX_IMPORT_TEXT_BYTES: 300 * 1024,
    PLAN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    ULTIMATE_RESUME_KEY: 'tabbit-resume-fill-assistant:ultimate-resume:v1',
    FLOATING_BALL_POSITION_KEY: 'tabbit-resume-fill-assistant:floating-ball-position:v1',
    PROFILE_PACKAGE_FORMAT: 'tabbit-resume-fill-assistant',
    PROFILE_PACKAGE_VERSION: 3,
    RESUME_SCHEMA_VERSION: 3,
    MAX_PROFILE_PACKAGE_BYTES: 1024 * 1024,
  };

  const RESUME_TEMPLATE = {
  "personal": {
    "label": "个人信息",
    "fields": {
      "fullName": { "aliases": ["姓名", "名字", "全名", "真实姓名", "中文姓名", "Full Name", "Legal Name"], "value": "李明" },
      "englishName": { "aliases": ["英文名", "英文姓名", "英文名字", "English Name", "Preferred English Name"], "value": null },
      "gender": { "aliases": ["性别", "Gender"], "value": "男" },
      "birthDate": { "aliases": ["出生日期", "生日", "出生年月", "DOB"], "value": "1995-03-15" },
      "age": { "aliases": ["年龄", "Age"], "value": 30 },
      "nationality": { "aliases": ["国籍", "Nationality"], "value": "中国" },
      "ethnicGroup": { "aliases": ["民族", "族裔", "Ethnicity"], "value": "汉族" },
      "politicalStatus": { "aliases": ["政治面貌", "党员", "Political Status"], "value": "中共党员" },
      "maritalStatus": { "aliases": ["婚姻状况", "婚否", "Marital Status"], "value": "已婚" },
      "phone": { "aliases": ["手机号", "手机", "电话", "Phone"], "value": "13800138000" },
      "email": { "aliases": ["邮箱", "电子邮箱", "Email"], "value": "liming_test@example.com" },
      "currentLocation": { "aliases": ["现居城市", "当前城市", "现居地", "当前所在地", "当前居住地", "所在城市", "现住地", "Current Location", "Residence"], "value": "北京" },
      "hometown": { "aliases": ["籍贯", "原籍", "祖籍", "Hometown", "Native Place"], "value": "河北石家庄" },
      "hukouLocation": { "aliases": ["户口所在地", "户籍所在地", "户籍地址", "Hukou Location", "Registered Residence"], "value": null },
      "currentEmploymentStatus": { "aliases": ["当前工作状态", "在职状态", "是否在职", "就业状态", "离职状态", "Employment Status"], "value": null },
      "workExperienceYears": { "aliases": ["工作年限", "工龄", "Years of Experience"], "value": 8 },
      "idCard": { "aliases": ["身份证号", "身份证", "证件号码", "ID Card"], "value": "130102199503150015" },
      "photo": { "aliases": ["照片", "证件照", "头像", "Photo"], "sensitive": true, "value": null }
    }
  },

  "jobIntention": {
    "label": "求职意向",
    "fields": {
      "targetPosition": { "aliases": ["期望岗位", "意向岗位", "目标岗位", "应聘岗位", "Job Title"], "value": "高级测试开发工程师" },
      "targetCity": { "aliases": ["期望城市", "意向城市", "工作城市", "Desired City"], "value": "北京" },
      "targetSalary": { "aliases": ["期望薪资", "薪资要求", "Expected Salary"], "value": "30k-45k" },
      "targetIndustry": { "aliases": ["期望行业", "意向行业", "目标行业", "Desired Industry", "Target Industry"], "value": null },
      "jobType": { "aliases": ["工作性质", "求职类型", "Job Type"], "value": "全职" },
      "relocationPreference": { "aliases": ["是否接受异地", "是否接受调动", "异地工作意愿", "接受异地", "Relocation Preference"], "value": null },
      "travelWillingness": { "aliases": ["是否接受出差", "出差意愿", "接受出差", "Travel Willingness"], "value": null },
      "availableDate": { "aliases": ["到岗时间", "入职时间", "可到岗日期", "Available Date"], "value": "随时到岗" }
    }
  },

  "education": {
    "label": "教育经历",
    "isRepeatable": true,
    "items": [
      {
        "school": { "aliases": ["学校", "院校", "毕业院校", "School"], "value": "中国科学院大学" },
        "college": { "aliases": ["学院名称", "所属学院", "院系", "学院", "Faculty", "College"], "value": "计算机学院" },
        "educationLevel": { "aliases": ["学历", "学历层次", "Education Level"], "value": "硕士" },
        "degreeName": { "aliases": ["学位", "获得学位", "学位名称", "Degree Name"], "value": null },
        "major": { "aliases": ["专业", "所学专业", "Major"], "value": "计算机科学与技术" },
        "minor": { "aliases": ["辅修", "双专业", "Minor"], "value": null },
        "startDate": { "aliases": ["入学时间", "开始日期", "Start Date"], "value": "2018-09" },
        "endDate": { "aliases": ["毕业时间", "结束日期", "End Date"], "value": "2021-06" },
        "expectedGraduationDate": { "aliases": ["预计毕业时间", "预计毕业年月", "预计毕业日期", "Expected Graduation Date"], "value": null },
        "researchDirection": { "aliases": ["研究方向", "研究领域", "科研方向", "专业方向", "Research Direction"], "value": null },
        "schoolLocation": { "aliases": ["学校所在地", "院校所在地", "学校城市", "School Location"], "value": null },
        "graduationMethod": { "aliases": ["毕业方式", "是否应届", "应届生身份", "Graduation Method", "Graduate Status"], "value": null },
        "gpa": { "aliases": ["GPA", "绩点"], "value": "3.8/4.0" },
        "ranking": { "aliases": ["排名", "专业排名", "Ranking"], "value": "前10%" },
        "advisor": { "aliases": ["导师", "指导老师", "Advisor"], "value": "王建国教授" },
        "thesisTitle": { "aliases": ["论文题目", "毕业论文", "Thesis"], "value": "基于深度学习的测试用例自动生成方法研究" },
        "courses": { "aliases": ["主修课程", "核心课程", "Courses"], "value": ["高级软件工程", "软件测试理论与方法", "分布式系统", "机器学习"] },
        "scholarships": { "aliases": ["奖学金", "Scholarship"], "value": ["校级一等奖学金(2019)", "校级一等奖学金(2020)"] },
        "isUnified": { "aliases": ["统招", "是否统招"], "value": true },
        "isFullTime": { "aliases": ["全日制", "学习方式"], "value": true }
      },
      {
        "school": { "aliases": ["学校", "院校", "School"], "value": "北京工业大学" },
        "college": { "aliases": ["学院名称", "所属学院", "院系", "学院", "Faculty", "College"], "value": null },
        "educationLevel": { "aliases": ["学历", "学历层次", "Education Level"], "value": "本科" },
        "degreeName": { "aliases": ["学位", "获得学位", "学位名称", "Degree Name"], "value": null },
        "major": { "aliases": ["专业", "Major"], "value": "软件工程" },
        "startDate": { "aliases": ["入学时间", "Start Date"], "value": "2012-09" },
        "endDate": { "aliases": ["毕业时间", "End Date"], "value": "2016-06" },
        "expectedGraduationDate": { "aliases": ["预计毕业时间", "预计毕业年月", "预计毕业日期", "Expected Graduation Date"], "value": null },
        "researchDirection": { "aliases": ["研究方向", "研究领域", "科研方向", "专业方向", "Research Direction"], "value": null },
        "schoolLocation": { "aliases": ["学校所在地", "院校所在地", "学校城市", "School Location"], "value": null },
        "graduationMethod": { "aliases": ["毕业方式", "是否应届", "应届生身份", "Graduation Method", "Graduate Status"], "value": null },
        "courses": { "aliases": ["主修课程", "Courses"], "value": ["软件工程", "数据结构", "数据库原理", "操作系统"] },
        "gpa": { "aliases": ["GPA"], "value": null },
        "ranking": { "aliases": ["排名"], "value": null },
        "advisor": { "aliases": ["导师"], "value": null },
        "thesisTitle": { "aliases": ["论文题目"], "value": null },
        "minor": { "aliases": ["辅修"], "value": null },
        "scholarships": { "aliases": ["奖学金"], "value": [] },
        "isUnified": { "aliases": ["统招"], "value": true },
        "isFullTime": { "aliases": ["全日制"], "value": true }
      }
    ]
  },

  "workExperience": {
    "label": "工作经历",
    "isRepeatable": true,
    "items": [
      {
        "company": { "aliases": ["公司", "公司名称", "公司全称", "单位", "Company"], "value": "美团" },
        "companyNature": { "aliases": ["单位性质", "企业性质", "公司性质", "所有制性质", "Company Nature"], "value": null },
        "industry": { "aliases": ["所属行业", "行业类别", "所在行业", "Industry"], "value": null },
        "department": { "aliases": ["部门", "所在部门", "团队", "Department"], "value": "外卖技术部" },
        "position": { "aliases": ["职位", "岗位", "职务", "岗位名称", "Position"], "value": "高级测试开发工程师" },
        "jobLevel": { "aliases": ["职级", "岗位级别", "职等", "职位级别", "Job Level"], "value": null },
        "startDate": { "aliases": ["入职时间", "开始时间", "Start Date"], "value": "2021-07" },
        "endDate": { "aliases": ["离职时间", "结束时间", "End Date"], "value": "至今" },
        "employmentType": { "aliases": ["工作性质", "用工形式", "Employment Type"], "value": "全职" },
        "workLocation": { "aliases": ["工作地点", "办公地点", "Work Location"], "value": "北京" },
        "workDetail": { "aliases": ["工作职责", "工作内容", "职责描述", "工作描述", "工作成果", "主要业绩", "业绩", "工作详情", "实习内容", "实习职责", "实习描述", "实习成果", "实习详情", "Work Description", "Intern Description", "Responsibilities", "Achievements", "Details"], "value": "负责外卖业务核心交易链路的质量保障，涵盖下单、支付、履约全流程；设计并维护自动化测试框架，接口自动化覆盖率从45%提升至85%；推动CI/CD流水线集成自动化测试，发布周期从周级缩短至日级；主导性能测试体系建设，建立压测基线与容量评估模型；带领5人测试团队，制定测试流程规范与质量度量体系。线上P0故障下降70%，回归工时从3人日降至0.5人日；核心模块代码覆盖率提升至90%+" },
        "salary": { "aliases": ["薪资", "薪酬", "Salary"], "sensitive": true, "value": null },
        "reportTo": { "aliases": ["汇报对象", "直属上级", "Report To"], "value": null },
        "teamSize": { "aliases": ["团队规模", "下属人数", "Team Size"], "value": 5 },
        "reasonForLeaving": { "aliases": ["离职原因", "Reason for Leaving"], "value": null }
      },
      {
        "company": { "aliases": ["公司", "公司名称", "Company"], "value": "字节跳动" },
        "companyNature": { "aliases": ["单位性质", "企业性质", "公司性质", "所有制性质", "Company Nature"], "value": null },
        "industry": { "aliases": ["所属行业", "行业类别", "所在行业", "Industry"], "value": null },
        "department": { "aliases": ["部门", "Department"], "value": "抖音电商" },
        "position": { "aliases": ["职位", "岗位", "Position"], "value": "测试开发工程师" },
        "jobLevel": { "aliases": ["职级", "岗位级别", "职等", "职位级别", "Job Level"], "value": null },
        "startDate": { "aliases": ["开始时间", "Start Date"], "value": "2018-07" },
        "endDate": { "aliases": ["结束时间", "End Date"], "value": "2021-06" },
        "employmentType": { "aliases": ["工作性质"], "value": "全职" },
        "workLocation": { "aliases": ["工作地点"], "value": "北京" },
        "workDetail": { "aliases": ["工作职责", "工作内容", "职责描述", "工作描述", "工作成果", "主要业绩", "业绩", "工作详情", "实习内容", "实习职责", "实习描述", "实习成果", "实习详情", "Work Description", "Intern Description", "Responsibilities", "Achievements", "Details"], "value": "负责抖音电商订单与售后模块的功能测试与回归测试；编写并维护2000+条接口测试用例；设计数据构造平台，测试数据准备效率提升60%。参与混沌工程演练，发现并修复3个线上潜在故障点" },
        "salary": { "aliases": ["薪资", "Salary"], "sensitive": true, "value": null },
        "reportTo": { "aliases": ["汇报对象"], "value": null },
        "teamSize": { "aliases": ["团队规模"], "value": 0 },
        "reasonForLeaving": { "aliases": ["离职原因"], "value": null }
      },
      {
        "company": { "aliases": ["公司", "Company"], "value": "百度" },
        "companyNature": { "aliases": ["单位性质", "企业性质", "公司性质", "所有制性质", "Company Nature"], "value": null },
        "industry": { "aliases": ["所属行业", "行业类别", "所在行业", "Industry"], "value": null },
        "department": { "aliases": ["部门", "Department"], "value": "百度地图" },
        "position": { "aliases": ["职位", "Position"], "value": "测试工程师" },
        "jobLevel": { "aliases": ["职级", "岗位级别", "职等", "职位级别", "Job Level"], "value": null },
        "startDate": { "aliases": ["开始时间", "Start Date"], "value": "2016-07" },
        "endDate": { "aliases": ["结束时间", "End Date"], "value": "2018-06" },
        "employmentType": { "aliases": ["工作性质"], "value": "全职" },
        "workLocation": { "aliases": ["工作地点"], "value": "北京" },
        "workDetail": { "aliases": ["工作职责", "工作内容", "职责描述", "工作描述", "工作成果", "主要业绩", "业绩", "工作详情", "实习内容", "实习职责", "实习描述", "实习成果", "实习详情", "Work Description", "Intern Description", "Responsibilities", "Achievements", "Details"], "value": "负责百度地图搜索模块的功能测试与接口测试；参与自动化测试框架搭建，编写自动化用例800+条；负责地图数据质量校验工具开发。POI数据准确率从92%提升至99%；人工抽检工时降低80%" },
        "salary": { "aliases": ["薪资", "Salary"], "sensitive": true, "value": null },
        "reportTo": { "aliases": ["汇报对象"], "value": null },
        "teamSize": { "aliases": ["团队规模"], "value": 0 },
        "reasonForLeaving": { "aliases": ["离职原因"], "value": null }
      }
    ]
  },

  "projectExperience": {
    "label": "项目经历",
    "isRepeatable": true,
    "items": [
      {
        "projectName": { "aliases": ["项目名称", "项目名", "Project Name"], "value": "外卖交易系统质量保障体系升级" },
        "projectRole": { "aliases": ["项目角色", "担任角色", "Role"], "value": "项目负责人" },
        "projectDetail": { "aliases": ["项目描述", "项目简介", "项目背景", "项目内容", "项目经历", "项目详情", "项目职责", "负责内容", "我的职责", "项目成果", "项目业绩", "成果", "Project Description", "Responsibilities", "Achievements", "Details"], "value": "业务复杂度上升，传统手工测试无法满足高频发布需求。搭建基于Pytest+Allure的接口自动化测试框架；引入流量回放进行回归验证；建立线上巡检与告警机制。线上P0故障下降70%；回归工时从3人日降至0.5人日；自动化用例数3000+" },
        "startDate": { "aliases": ["项目开始时间", "开始日期", "Start Date"], "value": "2022-03" },
        "endDate": { "aliases": ["项目结束时间", "结束日期", "End Date"], "value": "2023-06" },
        "techStack": { "aliases": ["技术栈", "使用技术", "Tech Stack"], "value": ["Python", "Pytest", "Allure", "Jenkins", "流量回放"] },
        "projectScale": { "aliases": ["项目规模", "团队规模", "Project Scale"], "value": "5人团队，核心交易链路30+微服务" },
        "projectLink": { "aliases": ["项目链接", "项目地址", "Project Link"], "value": null }
      },
      {
        "projectName": { "aliases": ["项目名称", "Project Name"], "value": "全链路压测平台建设" },
        "projectRole": { "aliases": ["项目角色", "Role"], "value": "核心开发" },
        "projectDetail": { "aliases": ["项目描述", "项目简介", "项目背景", "项目内容", "项目经历", "项目详情", "项目职责", "负责内容", "我的职责", "项目成果", "项目业绩", "成果", "Project Description", "Responsibilities", "Achievements", "Details"], "value": "大促期间系统容量评估缺乏依据。基于JMeter+Grafana搭建全链路压测平台；实现流量模型仿真与实时监控。精准识别5处性能瓶颈；大促期间零容量事故" },
        "startDate": { "aliases": ["开始时间", "Start Date"], "value": "2021-09" },
        "endDate": { "aliases": ["结束时间", "End Date"], "value": "2022-02" },
        "techStack": { "aliases": ["技术栈", "Tech Stack"], "value": ["JMeter", "Grafana", "Prometheus"] },
        "projectScale": { "aliases": ["项目规模"], "value": null },
        "projectLink": { "aliases": ["项目链接"], "value": null }
      }
    ]
  },

  "internship": {
    "label": "实习经历",
    "isRepeatable": true,
    "items": [
      {
        "company": { "aliases": ["实习公司", "公司", "Company"], "value": "京东" },
        "internshipType": { "aliases": ["实习类型", "实习性质", "是否全职实习", "Internship Type"], "value": null },
        "department": { "aliases": ["部门", "Department"], "value": "测试开发部" },
        "position": { "aliases": ["实习岗位", "职位", "Position"], "value": "测试实习生" },
        "startDate": { "aliases": ["实习开始时间", "Start Date"], "value": "2017-06" },
        "endDate": { "aliases": ["实习结束时间", "End Date"], "value": "2017-09" },
        "internDetail": { "aliases": ["实习内容", "实习职责", "实习成果", "实习描述", "实习详情", "工作内容", "工作职责", "职责描述", "工作描述", "工作成果", "主要业绩", "业绩", "工作详情", "Intern Description", "Work Description", "Responsibilities", "Achievements", "Details"], "value": "参与订单系统接口测试，编写测试用例200+条；协助搭建自动化测试脚本。获优秀实习生称号" }
      }
    ]
  },

  "campusExperience": {
    "label": "校园经历",
    "isRepeatable": true,
    "items": [
      {
        "organization": { "aliases": ["学生组织", "社团名称", "学生会", "校园组织", "实验室", "Campus Organization"], "value": null },
        "studentCadreRole": { "aliases": ["学生干部职务", "社团职务", "校园职务", "学生工作职务", "Campus Role"], "value": null },
        "startDate": { "aliases": ["校园经历开始时间", "任职开始时间", "Campus Start Date"], "value": null },
        "endDate": { "aliases": ["校园经历结束时间", "任职结束时间", "Campus End Date"], "value": null },
        "campusDetail": { "aliases": ["校园经历描述", "学生工作内容", "社团经历描述", "校园职责", "Campus Experience Detail"], "value": null }
      }
    ]
  },

  "competitions": {
    "label": "竞赛经历",
    "isRepeatable": true,
    "items": [
      {
        "competitionName": { "aliases": ["竞赛名称", "比赛名称", "学科竞赛", "Competition Name"], "value": null },
        "awardName": { "aliases": ["竞赛奖项", "比赛奖项", "获奖名称", "Competition Award"], "value": null },
        "awardLevel": { "aliases": ["竞赛奖项级别", "比赛级别", "获奖级别", "Competition Level"], "value": null },
        "awardDate": { "aliases": ["竞赛获奖时间", "比赛时间", "Competition Date"], "value": null },
        "organizer": { "aliases": ["竞赛主办方", "主办单位", "Competition Organizer"], "value": null },
        "competitionDetail": { "aliases": ["竞赛经历描述", "比赛内容", "竞赛项目描述", "Competition Detail"], "value": null }
      }
    ]
  },

  "volunteerExperience": {
    "label": "志愿经历",
    "isRepeatable": true,
    "items": [
      {
        "organization": { "aliases": ["志愿服务组织", "志愿单位", "公益组织", "Volunteer Organization"], "value": null },
        "role": { "aliases": ["志愿者角色", "志愿岗位", "服务角色", "Volunteer Role"], "value": null },
        "startDate": { "aliases": ["志愿服务开始时间", "Volunteer Start Date"], "value": null },
        "endDate": { "aliases": ["志愿服务结束时间", "Volunteer End Date"], "value": null },
        "volunteerDetail": { "aliases": ["志愿服务内容", "公益经历描述", "社会实践内容", "Volunteer Detail"], "value": null }
      }
    ]
  },

  "trainingExperience": {
    "label": "培训经历",
    "isRepeatable": true,
    "items": [
      {
        "trainingName": { "aliases": ["培训名称", "培训课程", "培训项目", "Training Name"], "value": null },
        "provider": { "aliases": ["培训机构", "培训单位", "课程提供方", "Training Provider"], "value": null },
        "startDate": { "aliases": ["培训开始时间", "Training Start Date"], "value": null },
        "endDate": { "aliases": ["培训结束时间", "Training End Date"], "value": null },
        "trainingDetail": { "aliases": ["培训内容", "课程内容", "培训描述", "Training Detail"], "value": null },
        "certificate": { "aliases": ["培训证书", "培训认证", "Training Certificate"], "value": null }
      }
    ]
  },

  "skills": {
    "label": "专业技能",
    "isRepeatable": true,
    "items": [
      { "category": { "aliases": ["技能类别", "Category"], "value": "测试理论" }, "skillName": { "aliases": ["技能", "技能名称", "Skill"], "value": "功能测试、接口测试、性能测试、兼容性测试、探索性测试" }, "proficiency": { "aliases": ["熟练度", "掌握程度", "Proficiency"], "value": "精通" } },
      { "category": { "aliases": ["技能类别", "Category"], "value": "自动化测试" }, "skillName": { "aliases": ["技能", "Skill"], "value": "Python+Pytest / Java+TestNG / Appium" }, "proficiency": { "aliases": ["熟练度", "Proficiency"], "value": "熟练" } },
      { "category": { "aliases": ["技能类别", "Category"], "value": "性能测试" }, "skillName": { "aliases": ["技能", "Skill"], "value": "JMeter、Locust、LoadRunner" }, "proficiency": { "aliases": ["熟练度", "Proficiency"], "value": "熟练" } },
      { "category": { "aliases": ["技能类别", "Category"], "value": "持续集成" }, "skillName": { "aliases": ["技能", "Skill"], "value": "Jenkins、GitLab CI、GitHub Actions" }, "proficiency": { "aliases": ["熟练度", "Proficiency"], "value": "熟练" } },
      { "category": { "aliases": ["技能类别", "Category"], "value": "数据库" }, "skillName": { "aliases": ["技能", "Skill"], "value": "MySQL、Redis、Doris" }, "proficiency": { "aliases": ["熟练度", "Proficiency"], "value": "熟练" } },
      { "category": { "aliases": ["技能类别", "Category"], "value": "编程语言" }, "skillName": { "aliases": ["技能", "Skill"], "value": "Python、Java、Shell、Go" }, "proficiency": { "aliases": ["熟练度", "Proficiency"], "value": "熟练" } }
    ]
  },

  "certifications": {
    "label": "证书",
    "isRepeatable": true,
    "items": [
      { "certName": { "aliases": ["证书名称", "证书", "Certificate"], "value": "ISTQB高级测试工程师认证" }, "issuingOrg": { "aliases": ["颁发机构", "Issuing Org"], "value": "ISTQB" }, "issueDate": { "aliases": ["获得时间", "颁发日期", "Issue Date"], "value": "2020-06" } },
      { "certName": { "aliases": ["证书名称", "Certificate"], "value": "软考软件评测师(中级)" }, "issuingOrg": { "aliases": ["颁发机构"], "value": "工信部" }, "issueDate": { "aliases": ["获得时间", "Issue Date"], "value": "2019-11" } },
      { "certName": { "aliases": ["证书名称", "Certificate"], "value": "软考系统架构设计师(高级)" }, "issuingOrg": { "aliases": ["颁发机构"], "value": "工信部" }, "issueDate": { "aliases": ["获得时间", "Issue Date"], "value": "2022-11" } }
    ]
  },

  "awards": {
    "label": "获奖经历",
    "isRepeatable": true,
    "items": [
      { "awardName": { "aliases": ["奖项名称", "获奖", "荣誉", "Award"], "value": "美团技术部年度优秀员工" }, "awardOrg": { "aliases": ["颁奖单位", "颁发机构"], "value": "美团" }, "awardDate": { "aliases": ["获奖时间", "Award Date"], "value": "2023" }, "awardLevel": { "aliases": ["奖项级别", "Level"], "value": "公司级" } },
      { "awardName": { "aliases": ["奖项名称", "Award"], "value": "公司级质量之星" }, "awardOrg": { "aliases": ["颁奖单位"], "value": "美团" }, "awardDate": { "aliases": ["获奖时间", "Award Date"], "value": "2022" }, "awardLevel": { "aliases": ["奖项级别"], "value": "公司级" } },
      { "awardName": { "aliases": ["奖项名称", "Award"], "value": "电商业务卓越贡献奖" }, "awardOrg": { "aliases": ["颁奖单位"], "value": "字节跳动" }, "awardDate": { "aliases": ["获奖时间", "Award Date"], "value": "2021" }, "awardLevel": { "aliases": ["奖项级别"], "value": "业务线级" } }
    ]
  },

  "publications": {
    "label": "论文",
    "isRepeatable": true,
    "items": [
      { "title": { "aliases": ["论文标题", "文章标题", "标题", "Title"], "value": "基于深度学习的测试用例自动生成方法研究" }, "authors": { "aliases": ["作者", "第一作者", "Author"], "value": "李明, 王建国" }, "venue": { "aliases": ["发表期刊", "会议", "刊物", "Journal"], "value": "软件学报" }, "publishDate": { "aliases": ["发表时间", "出版日期", "Publish Date"], "value": "2020-08" } }
    ]
  },

  "patents": {
    "label": "专利",
    "isRepeatable": true,
    "items": [
      { "patentName": { "aliases": ["专利名称", "专利", "Patent"], "value": "一种基于流量回放的接口回归测试方法及装置" }, "patentNumber": { "aliases": ["专利号", "Patent Number"], "value": "CN202210012345.6" }, "patentType": { "aliases": ["专利类型", "Patent Type"], "value": "发明专利" }, "inventors": { "aliases": ["发明人", "Inventor"], "value": "李明; 张伟" }, "filingDate": { "aliases": ["申请日期", "Filing Date"], "value": "2022-01-15" }, "grantDate": { "aliases": ["授权日期", "Grant Date"], "value": "2023-06-20" }, "status": { "aliases": ["专利状态", "Status"], "value": "已授权" } }
    ]
  },

  "languages": {
    "label": "语言能力",
    "isRepeatable": true,
    "items": [
      { "language": { "aliases": ["语言", "语种", "Language"], "value": "英语" }, "proficiency": { "aliases": ["水平", "熟练程度", "Proficiency"], "value": "CET-6，可流利读写技术文档" }, "certificate": { "aliases": ["证书", "Certificate"], "value": "CET-6 (580分)" } },
      { "language": { "aliases": ["语言", "Language"], "value": "中文" }, "proficiency": { "aliases": ["水平", "Proficiency"], "value": "母语" }, "certificate": { "aliases": ["证书"], "value": null } }
    ]
  },

  "selfEvaluation": {
    "label": "自我评价",
    "fields": {
      "summary": { "aliases": ["自我评价", "个人简介", "自我描述", "自我介绍", "Self Evaluation"], "value": "8年测试开发经验，深耕互联网核心业务质量保障体系。具备从功能测试到自动化、性能、AI辅助测试的全栈能力。擅长搭建测试框架和质量度量体系，有5人团队管理经验。注重工程效能提升，追求测试左移与精准测试实践。" },
      "highlights": { "aliases": ["亮点", "核心优势", "个人优势", "Highlights"], "value": ["8年测试开发经验，3段大厂经历", "主导搭建3个测试平台，1项发明专利", "从0到1搭建AI辅助测试方向"] }
    }
  },

  "portfolio": {
    "label": "作品集",
    "isRepeatable": true,
    "items": [
      { "name": { "aliases": ["作品名称", "项目名", "Project Name"], "value": "自动化测试框架开源项目" }, "url": { "aliases": ["链接", "地址", "URL"], "value": "https://github.com/liming/auto-test-framework" }, "description": { "aliases": ["描述", "简介", "Description"], "value": "基于Pytest的轻量级接口自动化测试框架，Star 500+" } },
      { "name": { "aliases": ["作品名称", "Project Name"], "value": "测试技术博客" }, "url": { "aliases": ["链接", "URL"], "value": "https://blog.csdn.net/liming_test" }, "description": { "aliases": ["描述", "Description"], "value": "专注测试开发和质量工程，累计阅读50万+" } }
    ]
  },

  "socialLinks": {
    "label": "社交链接",
    "fields": {
      "github": { "aliases": ["GitHub", "Github", "github主页"], "value": "https://github.com/liming" },
      "linkedin": { "aliases": ["LinkedIn", "领英"], "value": null },
      "blog": { "aliases": ["博客", "技术博客", "Blog"], "value": "https://blog.csdn.net/liming_test" },
      "weChat": { "aliases": ["微信", "微信号", "WeChat"], "sensitive": true, "value": null },
      "website": { "aliases": ["个人网站", "个人主页", "Website"], "value": null }
    }
  },

  "references": {
    "label": "推荐人",
    "isRepeatable": true,
    "items": [
      { "name": { "aliases": ["推荐人姓名", "证明人", "Reference Name"], "value": "张伟" }, "position": { "aliases": ["推荐人职位", "Position"], "value": "美团技术总监" }, "company": { "aliases": ["推荐人公司", "Company"], "value": "美团" }, "phone": { "aliases": ["推荐人电话", "Phone"], "sensitive": true, "value": null }, "email": { "aliases": ["推荐人邮箱", "Email"], "value": null }, "relationship": { "aliases": ["关系", "Relationship"], "value": "直属上级" } }
    ]
  },

  "customSections": {
    "label": "自定义模块",
    "isRepeatable": true,
    "items": [
      {
        "sectionName": { "aliases": ["模块名称", "自定义模块"], "value": "培训经历" },
        "items": [
          { "name": { "aliases": ["培训名称"], "value": "美团技术学院：DevOps最佳实践" }, "date": { "aliases": ["培训时间", "Date"], "value": "2022-03" }, "description": { "aliases": ["培训描述", "Description"], "value": "学习CI/CD流水线设计与DevOps文化建设" } }
        ]
      }
    ]
  }
};

  // 首次使用且当前站点尚无任何简历资料时，直接提供可体验的内置 demo。
  // 该资料不会写入 localStorage；用户保存、导入或清空后，均切换为该站点自己的本地资料状态。
  const DEFAULT_DEMO_PROFILE = [
    '姓名：张三',
    '手机号：13800138000',
    '邮箱：mailto:zhangsan@example.com',
    '求职意向：前端开发工程师',
    '',
    '教育经历：',
    'XX大学 计算机科学与技术 本科',
    '2021.09 — 2025.06',
    '主修课程：数据结构与算法、操作系统、计算机网络、软件工程、Web前端开发',
    '',
    '实习经历：',
    'ABC科技有限公司 前端开发实习生',
    '2024.06 — 2024.12',
    '- 负责公司核心B端管理平台的前端开发与维护，使用React + TypeScript技术栈',
    '- 参与设计并实现了一套基于Ant Design的通用表单组件库，减少业务线重复开发约30%',
    '- 优化页面首屏加载性能，通过懒加载和代码拆分将LCP从3.2s降至1.5s',
    '- 配合后端完成接口联调，使用Axios封装统一请求拦截器处理token刷新和错误提示',
    '',
    '项目经历：',
    '在线协作白板系统',
    '2024.03 — 2024.05',
    '- 独立开发了一款支持多人实时协作的在线白板Web应用',
    '- 使用Canvas + WebSocket实现绘图同步，支持画笔、矩形、文本、橡皮擦等工具',
    '- 设计并实现操作历史栈，支持撤销/重做和冲突合并',
    '- 部署至Vercel，单页面加载控制在200KB以内',
    '',
    '个人博客系统',
    '2023.10 — 2023.12',
    '- 使用Next.js + Tailwind CSS搭建的静态博客，支持Markdown渲染和代码高亮',
    '- 集成GitHub Actions实现自动化部署，文章通过GitHub Issues管理',
    '- 接入Vercel Analytics进行访问数据统计',
    '',
    '技能：',
    '- 前端框架：React、Vue3、Next.js',
    '- 语言：JavaScript（ES6+）、TypeScript、HTML5、CSS3',
    '- 工具链：Webpack、Vite、Git、npm/yarn/pnpm',
    '- UI库：Ant Design、Element Plus、Tailwind CSS',
    '- 其他：Node.js、RESTful API设计、基础的数据库操作',
  ].join('\n');

  // 基于同一份 schema 构建 demo 副本，确保它与 AI 生成、导入导出的副本完全兼容。
  // 每次按需创建，避免内存中的体验副本被页面操作意外修改。
  function createDefaultDemoResume() {
    const resume = JSON.parse(JSON.stringify(RESUME_TEMPLATE));
    const clearFieldValues = fields => {
      Object.values(fields || {}).forEach(field => {
        if (field && typeof field === 'object' && Array.isArray(field.aliases)) field.value = Array.isArray(field.value) ? [] : null;
      });
    };
    const createItem = (moduleKey, values) => {
      const item = JSON.parse(JSON.stringify(RESUME_TEMPLATE[moduleKey].items[0]));
      clearFieldValues(item);
      Object.entries(values).forEach(([key, value]) => { if (item[key]) item[key].value = value; });
      return item;
    };

    Object.values(resume).forEach(module => {
      if (module.fields) clearFieldValues(module.fields);
      if (module.isRepeatable) module.items = [];
    });
    const set = (moduleKey, fieldKey, value) => { resume[moduleKey].fields[fieldKey].value = value; };

    set('personal', 'fullName', '张三');
    set('personal', 'phone', '13800138000');
    // 原始 demo 保留 mailto: 写法；副本使用可直接填写至 email 控件的规范邮箱值。
    set('personal', 'email', 'zhangsan@example.com');
    set('jobIntention', 'targetPosition', '前端开发工程师');

    resume.education.items = [createItem('education', {
      school: 'XX大学',
      educationLevel: '本科',
      major: '计算机科学与技术',
      startDate: '2021-09',
      endDate: '2025-06',
      courses: ['数据结构与算法', '操作系统', '计算机网络', '软件工程', 'Web前端开发'],
    })];
    resume.internship.items = [createItem('internship', {
      company: 'ABC科技有限公司',
      position: '前端开发实习生',
      startDate: '2024-06',
      endDate: '2024-12',
      internDetail: '负责公司核心B端管理平台的前端开发与维护，使用React + TypeScript技术栈；参与设计并实现一套基于Ant Design的通用表单组件库，减少业务线重复开发约30%；优化页面首屏加载性能，通过懒加载和代码拆分将LCP从3.2s降至1.5s；配合后端完成接口联调，使用Axios封装统一请求拦截器处理token刷新和错误提示。',
    })];
    resume.projectExperience.items = [
      createItem('projectExperience', {
        projectName: '在线协作白板系统',
        projectRole: '独立开发',
        startDate: '2024-03',
        endDate: '2024-05',
        techStack: ['Canvas', 'WebSocket'],
        projectDetail: '独立开发一款支持多人实时协作的在线白板Web应用；使用Canvas + WebSocket实现绘图同步，支持画笔、矩形、文本、橡皮擦等工具；设计并实现操作历史栈，支持撤销/重做和冲突合并；部署至Vercel，单页面加载控制在200KB以内。',
      }),
      createItem('projectExperience', {
        projectName: '个人博客系统',
        startDate: '2023-10',
        endDate: '2023-12',
        techStack: ['Next.js', 'Tailwind CSS', 'GitHub Actions', 'Vercel Analytics'],
        projectDetail: '使用Next.js + Tailwind CSS搭建静态博客，支持Markdown渲染和代码高亮；集成GitHub Actions实现自动化部署，文章通过GitHub Issues管理；接入Vercel Analytics进行访问数据统计。',
      }),
    ];
    resume.skills.items = [
      createItem('skills', { category: '前端框架', skillName: 'React、Vue3、Next.js' }),
      createItem('skills', { category: '语言', skillName: 'JavaScript（ES6+）、TypeScript、HTML5、CSS3' }),
      createItem('skills', { category: '工具链', skillName: 'Webpack、Vite、Git、npm/yarn/pnpm' }),
      createItem('skills', { category: 'UI库', skillName: 'Ant Design、Element Plus、Tailwind CSS' }),
      createItem('skills', { category: '其他', skillName: 'Node.js、RESTful API设计、基础的数据库操作' }),
    ];
    return resume;
  }

  const RUNTIME_KEY = '__tabbitResumeFillAssistantV4Runtime__';
  // 用户可能同时启用了旧版和 v4，或在脚本更新后页面未刷新；同一页面只保留 v4 的一个运行实例。
  try { window[RUNTIME_KEY]?.dispose?.(); } catch (_) {}
  let root, shadow, layer, duplicateRootObserver, analysisSeq = 0, pagePlanSeq = 0;
  // 单队列串行化后台归档：避免多个异步任务基于同一份旧资料分别写入，造成后写覆盖前写。
  let profileUpdateQueue = Promise.resolve();
  const pendingProfileUpdateKeys = new Set();
  let planState = { status: 'missing', reason: '尚未生成简历副本' };
  function disposeRuntime() {
    duplicateRootObserver?.disconnect();
    duplicateRootObserver = null;
    root?.remove();
    root = shadow = layer = null;
  }
  window[RUNTIME_KEY] = { dispose: disposeRuntime };
  let fabExpanded = false;
  let fabPosition = null;

  function cleanText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  // 保留内部换行，仅去首尾空白，用于 AI 生成的多行内容（如工作职责）
  function trimValue(value) { return String(value || '').replace(/^[\s\n]+|[\s\n]+$/g, '').replace(/\n{3,}/g, '\n\n'); }
  function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function isAIAvailable() { return !!(window.LLMBridge && typeof window.LLMBridge.chat === 'function'); }
  function hash(value) { let h = 2166136261; for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function pageIdentity() { return `${location.origin}${location.pathname}|${document.title}`; }
  // 返回 null 表示该站点从未保存过资料；空字符串则表示用户曾主动清空资料，二者不能混淆。
  function getStoredProfile() {
    try {
      const current = localStorage.getItem(CONFIG.PROFILE_KEY);
      if (current !== null) return current;
      const legacy = localStorage.getItem('tabbit-resume-fill-assistant:profile:v1');
      return legacy === null ? null : legacy;
    } catch (_) { return null; }
  }
  function hasStoredProfile() { return getStoredProfile() !== null; }
  function profileVersion() {
    try {
      // 未落库的 demo 使用独立版本 0，首次保存时才正式进入本地资料版本序列。
      return hasStoredProfile() ? Number(localStorage.getItem(CONFIG.PROFILE_VERSION_KEY) || '1') : 0;
    } catch (_) { return 0; }
  }
  function getProfile() {
    const stored = getStoredProfile();
    return stored === null ? DEFAULT_DEMO_PROFILE : stored;
  }
  // 资料版本只表示事实源内容的变更，不表示用户点击了多少次保存。
  // 返回值用于调用方决定副本是否需要重新解析。
  function setProfile(value) {
    try {
      const text = String(value || '');
      // 按段落边界截断，避免在经历段落中间硬截，导致最后一段残缺
      const truncated = text.length <= CONFIG.MAX_PROFILE ? text : truncateAtParagraph(text, CONFIG.MAX_PROFILE);
      // 必须与真实的本地值比较：首次点击保存 demo 时也需要将它正式写入本地。
      if (getStoredProfile() === truncated) return false;
      const nextVersion = profileVersion() + 1;
      localStorage.setItem(CONFIG.PROFILE_KEY, truncated);
      localStorage.setItem(CONFIG.PROFILE_VERSION_KEY, String(nextVersion));
      return true;
    } catch (_) { return false; }
  }
  function truncateAtParagraph(text, maxLen) {
    const cut = text.slice(0, maxLen);
    // 找最后一个空行（段落分隔）作为截断点
    const lastBreak = cut.lastIndexOf('\n\n');
    return lastBreak > maxLen * 0.5 ? cut.slice(0, lastBreak).trimEnd() : cut;
  }
  function planKey() { return CONFIG.PAGE_PLAN_PREFIX + hash(pageIdentity()); }
  function isOwnNode(node) { return !!(node && (node === root || root?.contains(node) || root?.shadowRoot?.contains(node))); }
  function toDataUrl(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error || new Error('读取文件失败')); r.readAsDataURL(file); }); }
  function readTextFile(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error || new Error('读取文件失败')); r.readAsText(file, 'utf-8'); }); }

  // 第一阶段仅扩展原生且可验证的控件；不处理富文本、级联选择、自定义组件和标签输入，避免影响 v4 已有填写链路。
  const SUPPORTED_INPUT_TYPES = ['text', 'search', 'email', 'tel', 'url', 'month', 'date', 'datetime-local', 'number'];
  function isSupportedField(element) {
    if (!element || isOwnNode(element) || element.disabled || element.readOnly) return false;
    const tag = element.tagName?.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'select') return !!element.options?.length;
    if (tag !== 'input') return false;
    return SUPPORTED_INPUT_TYPES.includes((element.type || 'text').toLowerCase());
  }
  function isSensitiveField(element) {
    const meta = [element.type, element.name, element.id, element.autocomplete, element.placeholder, element.getAttribute('aria-label')].join(' ');
    // 身份证号码是招聘表单的常规字段，用户可通过双击确认后录入；其余认证与支付凭据继续拦截。
    return /password|验证码|verify|验证|银行卡|card|credit|cvv|护照|passport|支付|payment/i.test(meta);
  }
  // 向上找最近的分组容器，取其直接子元素中的"标签节点"：
  // 真实 <label>，或 class 含 label（label/form-label/item-label 等）且不含本字段的元素
  // 兼容 <div class="label">公司名称</div> 这类非 <label> 的兄弟标签结构
  function closestFieldLabel(element) {
    const isLabelLike = (el) => {
      if (!el || el.contains(element)) return false;
      if (el.tagName === 'LABEL') return true;
      return /(^|[\s_-])label([\s_-]|$)/i.test(el.getAttribute('class') || '');
    };
    let node = element.parentElement;
    let depth = 0;
    while (node && depth < 5) {
      // 只能在“恰好包含当前一个可填写控件”的字段容器中寻找无绑定标签。
      // 否则整个信息区中遗留的单个 .label 可能被误认成相邻字段（例如把“民族”给“当前城市”）。
      const controls = [...node.querySelectorAll('input,textarea,select')].filter(isSupportedField);
      if (controls.length === 1 && controls[0] === element) {
        const likes = [...node.children].filter(isLabelLike);
        if (likes.length === 1) return likes[0];
        if (likes.length > 1) return null;
      }
      node = node.parentElement;
      depth++;
    }
    return null;
  }
  // 表格型招聘表单通常把字段名放在输入框所在 td 的前一个 td/th 中；
  // 仅取不含其他可填写控件的相邻单元格，避免把相邻字段的值或整行内容误作标签。
  function getTableCellLabel(element) {
    const cell = element.closest('td,th');
    if (!cell) return '';
    const previousCell = cell.previousElementSibling;
    if (!previousCell || !/^(TD|TH)$/i.test(previousCell.tagName)) return '';
    if (previousCell.querySelector('input,textarea,select,button')) return '';
    return cleanText(previousCell.innerText).slice(0, 80);
  }
  function isGenericFieldHint(value) {
    const text = cleanText(value).replace(/[：:，,。.！!？?*＊]/g, '');
    return /^(请输入|请填写|请选择|请录入|必填|选填|点击选择|点击填写|选择|填写)$/u.test(text);
  }
  // 所有标签来源统一过滤通用控件文案；“请选择”只能表示控件当前状态，不能代表字段语义。
  function getUsableFieldLabel(value) {
    const text = cleanText(value).slice(0, 200);
    if (!text || isGenericFieldHint(text)) return '';
    return normalizeFieldSemantic(text) ? text : '';
  }
  function getAriaLabelledByText(element) {
    const ids = String(element.getAttribute('aria-labelledby') || '').trim().split(/\s+/).filter(Boolean);
    return ids.map(id => getUsableFieldLabel(document.getElementById(id)?.innerText)).filter(Boolean).join(' ').slice(0, 200);
  }
  // 自定义表单经常将标签渲染为普通 span/div，且输入节点与标签可能隔着多层包装。
  // 仅在“恰好包含当前一个控件”的字段容器中采集静态标题；禁止向包含多个控件的信息区回溯兄弟节点，
  // 否则会把同区相邻字段的标题（如“民族”）错误归给当前城市。
  function getPlainTextFieldLabel(element) {
    const targetRect = element.getBoundingClientRect();
    const isStaticLabel = (node) => {
      if (!node || node.contains(element) || node.matches?.('button,input,textarea,select') || node.querySelector?.('input,textarea,select,button,[role="combobox"]')) return '';
      const text = cleanText(node.innerText || node.textContent).slice(0, 80);
      if (!text || isGenericFieldHint(text) || /^[*＊]$/.test(text)) return '';
      const className = String(node.className || '');
      const semanticClass = /label|title|caption|field.?name|form.?item|control.?name|prompt/i.test(className);
      const rect = node.getBoundingClientRect?.();
      const spatiallyBefore = rect && rect.width > 0 && rect.height > 0 && (rect.bottom <= targetRect.top + 8 || rect.right <= targetRect.left + 8);
      return semanticClass || spatiallyBefore ? text : '';
    };
    let node = element;
    for (let depth = 0; node?.parentElement && depth < 7; depth++, node = node.parentElement) {
      const container = node.parentElement;
      const controls = [...container.querySelectorAll('input,textarea,select')].filter(isSupportedField);
      if (controls.length === 1 && controls[0] === element) {
        const labels = [...container.children]
          .filter(child => child !== node && !child.contains(element))
          .map(isStaticLabel)
          .filter(Boolean);
        if (labels.length === 1) return labels[0];
        // 同一字段容器中存在多个静态短文本时不猜测，转由 aria/name 或 AI 生成补充语义。
        if (labels.length > 1) return '';
      }
    }
    return '';
  }
  function getLabel(element) {
    const id = element.id ? CSS.escape(element.id) : '';
    const explicit = id && document.querySelector(`label[for="${id}"]`);
    // 不能使用 || 直接短路：部分自定义组件的 aria-label / 包裹 label 只是“请选择”，
    // 必须跳过这些通用文案，继续寻找页面可见的真实字段标题。
    const labelCandidates = [
      explicit?.innerText,
      element.closest('label')?.innerText,
      getAriaLabelledByText(element),
      getTableCellLabel(element),
      // 对无标准 label 的自定义控件，优先使用同一字段容器内可见的标题；
      // 它比跨层查找的无绑定 .label 更接近当前控件。
      getPlainTextFieldLabel(element),
      closestFieldLabel(element)?.innerText,
      element.getAttribute('aria-label'),
      element.placeholder,
      element.name,
      element.id,
    ];
    const fieldLabel = labelCandidates.map(getUsableFieldLabel).find(Boolean) || '';
    // 向上查找最近的分组标题（h2/h3/h4 或带 section-title 语义的节点），补充模块上下文
    const sectionTitle = getSectionTitle(element);
    return sectionTitle && fieldLabel ? `${sectionTitle} > ${fieldLabel}` : fieldLabel;
  }
  // 控件自身及其直接绑定标签是可靠的字段语义；placeholder、name 等可补足非标准表单。
  // 过滤无业务含义的通用提示，避免“请输入”“请选择”意外参与匹配。
  function getDirectFieldPhrases(element, fieldLabel) {
    const phrases = [];
    const add = (value) => {
      const text = getUsableFieldLabel(value);
      if (text && !phrases.includes(text)) phrases.push(text);
    };
    add(fieldLabel);
    const id = element.id ? CSS.escape(element.id) : '';
    const explicit = id && document.querySelector(`label[for="${id}"]`);
    add(explicit?.innerText);
    add(element.closest('label')?.innerText);
    add(getAriaLabelledByText(element));
    add(getTableCellLabel(element));
    add(closestFieldLabel(element)?.innerText);
    add(getPlainTextFieldLabel(element));
    add(element.getAttribute('aria-label'));
    add(element.getAttribute('data-field'));
    add(element.placeholder);
    add(element.name);
    add(element.id);
    add(element.autocomplete);
    return phrases;
  }
  // 非标准表单常把字段名称放在 textarea/input 的邻近标题或提示中，而非标准 label。
  // 仅提取字段所在容器及其前置兄弟中的短文本，避免把整块表单的其他字段混入匹配。
  function getFieldContextPhrases(element) {
    const phrases = [];
    const add = (value) => {
      const text = getUsableFieldLabel(value);
      if (text && !phrases.includes(text)) phrases.push(text);
    };
    const id = element.id ? CSS.escape(element.id) : '';
    const explicit = id && document.querySelector(`label[for="${id}"]`);
    add(explicit?.innerText);
    add(element.closest('label')?.innerText);
    add(closestFieldLabel(element)?.innerText);
    add(element.getAttribute('aria-label'));
    add(element.placeholder);
    add(element.name);
    add(element.id);
    add(element.autocomplete);

    const contextSelector = 'label,legend,h1,h2,h3,h4,h5,h6,[class*="label" i],[class*="title" i],[class*="name" i],[class*="desc" i],[class*="hint" i],[class*="prompt" i]';
    let node = element;
    for (let depth = 0; node?.parentElement && depth < 5; depth++, node = node.parentElement) {
      // 同一表单项内的标签/标题（例如 <div class="item-title">工作描述</div>）。
      [...node.parentElement.children].forEach(sibling => {
        if (sibling === node || sibling.contains(element)) return;
        if (sibling.matches?.(contextSelector)) add(sibling.innerText);
      });
      // 当前节点前面的标题，兼容“标题在输入容器外层前方”的布局。
      let previous = node.previousElementSibling;
      while (previous) {
        if (previous.matches?.(contextSelector)) add(previous.innerText);
        previous = previous.previousElementSibling;
      }
    }
    return phrases;
  }
  function getSectionTitle(element) {
    let node = element.parentElement;
    while (node && node !== document.body) {
      // 查找当前节点之前的兄弟或父级中的标题
      const heading = findPrecedingHeading(node);
      if (heading) return cleanText(heading.innerText).slice(0, 60);
      node = node.parentElement;
    }
    return '';
  }
  function findPrecedingHeading(el) {
    let sib = el.previousElementSibling;
    while (sib) {
      if (/^h[2-4]$/i.test(sib.tagName)) return sib;
      // 也匹配常见 class 命名：section-title、group-title、form-title 等
      if (sib.matches?.('h2,h3,h4,[class*="section-title"],[class*="group-title"],[class*="form-title"],[class*="block-title"]')) return sib;
      sib = sib.previousElementSibling;
    }
    return null;
  }
  function classifyField(element, label) {
    // 剥离 section 标题前缀，避免"工作经历"等 section 误命中 long_text 的"经历"
    const fieldLabel = label && label.includes('>') ? label.split('>').pop().trim() : label;
    const key = `${fieldLabel} ${element.name || ''} ${element.id || ''} ${element.placeholder || ''}`.toLowerCase();
    if (/公司名称|公司全称|实习单位|工作单位|任职公司|就职公司|雇主|单位名称|企业名称|company|employer|organization/i.test(key)) return 'company_name';
    if (/岗位名称|职位名称|担任岗位|职务|职位|角色|role|position|job.?title/i.test(key)) return 'role_title';
    if (/项目名称|项目名|project.?name/i.test(key)) return 'project_name';
    if (/奖状|奖项|荣誉|证书|award/i.test(key)) return 'award_name';
    if (/开始时间|入职时间|起始时间|start.?date|from/i.test(key)) return 'start_date';
    if (/结束时间|离职时间|终止时间|end.?date|to/i.test(key)) return 'end_date';
    if (/工作内容|主要职责|职责描述|负责内容|项目职责|工作描述|responsibilit|description/i.test(key)) return 'responsibilities';
    if (/姓名|name/i.test(key)) return 'name';
    if (/手机号|手机号码|手机|电话|phone|tel/i.test(key)) return 'phone';
    if (/邮箱|email/i.test(key)) return 'email';
    if (/学校|院校|university|college/i.test(key)) return 'school';
    if (/技能|skill/i.test(key)) return 'skills';
    if (/专业|major/i.test(key)) return 'major';
    if (/学历|degree|education/i.test(key)) return 'degree';
    if (/经历|项目|自我评价|优势|动机|总结|介绍|内容|描述/i.test(key) || element.tagName?.toLowerCase() === 'textarea') return 'long_text';
    return 'unknown';
  }
  function fieldKey(element, index) { return element.id || element.name || `field-${index}-${hash(`${getLabel(element)}|${element.type || element.tagName}`)}`; }
  function scanFields() {
    return [...document.querySelectorAll('input,textarea,select')].filter(element => isSupportedField(element) && !isSensitiveField(element)).map((element, index) => {
      const label = getLabel(element);
      const field = {
        key: fieldKey(element, index), element, label, fieldType: classifyField(element, label), inputType: element.tagName.toLowerCase() === 'select' ? 'select' : (element.type || element.tagName.toLowerCase()), required: element.required || element.getAttribute('aria-required') === 'true', currentValue: cleanText(element.value), selectorHint: { id: element.id || '', name: element.name || '', index }
      };
      if (element.tagName.toLowerCase() === 'select') {
        field.options = [...element.options].map(option => ({ value: option.value, text: cleanText(option.text) }));
      }
      return field;
    });
  }
  // AI 上下文仅允许携带字段语义与当前字段组内的非敏感锚点，避免把页面上的认证或个人联系方式发送出去。
  function isPrivateContextField(element) {
    const meta = [element.type, element.name, element.id, element.autocomplete, element.placeholder, element.getAttribute('aria-label')].join(' ');
    return /password|验证码|verify|验证|银行卡|card|credit|cvv|护照|passport|支付|payment|身份证|id.?number|手机号|手机号码|电话|phone|tel|mobile|邮箱|e-?mail|邮件/i.test(meta);
  }
  function getFieldGroupElement(field, fields) {
    let node = field.element.parentElement;
    while (node && node !== document.body) {
      const members = fields.filter(item => node.contains(item.element));
      // 选择最小的、能容纳当前字段及其同组字段的容器；过大的整页/整表单容器不作为字段组。
      if (members.length >= 2 && members.length <= 16) return node;
      node = node.parentElement;
    }
    return null;
  }
  // 页面往往只把“300字以内”写在 placeholder/提示文案中，而未设置 maxlength；
  // 将其作为 AI 生成约束，但不把它当作浏览器层面的硬限制。
  function getSuggestedTextLimit(...values) {
    for (const value of values) {
      const match = cleanText(value).match(/(\d{2,4})\s*(?:个?字|字符)(?:以内|以下|上限|限制)?/u);
      const limit = Number(match?.[1]);
      if (Number.isInteger(limit) && limit > 0) return limit;
    }
    return 0;
  }
  function getFieldAIContext(field, fields) {
    const element = field.element;
    const group = getFieldGroupElement(field, fields);
    const groupFields = group ? fields.filter(item => group.contains(item.element)) : [];
    const directPhrases = getDirectFieldPhrases(element, splitFieldContext(field.label).label);
    const contextualHints = getFieldContextPhrases(element).filter(text => !directPhrases.includes(text)).slice(0, 12);
    const peers = groupFields.filter(item => item !== field).slice(0, 12).map(item => ({
      label: item.label,
      directHints: getDirectFieldPhrases(item.element, splitFieldContext(item.label).label).slice(0, 5),
      inputType: item.inputType,
      value: !isPrivateContextField(item.element) && cleanText(item.element.value) ? trimValue(item.element.value).slice(0, 300) : '',
    }));
    return {
      label: field.label,
      directHints: directPhrases,
      contextualHints,
      inputType: field.inputType,
      fieldType: field.fieldType,
      placeholder: element.placeholder || '',
      name: element.name || '',
      id: element.id || '',
      maxLength: getFieldMaxLength(element) || null,
      suggestedMaxLength: getSuggestedTextLimit(element.placeholder, ...directPhrases, ...contextualHints) || null,
      options: field.options?.filter(option => option.value || option.text).slice(0, 40) || [],
      section: getSectionTitle(element),
      groupFieldCount: groupFields.length,
      peerFields: peers,
    };
  }
  function pageContext(fields) {
    const forms = [...new Set(fields.map(f => f.element.closest('form')).filter(Boolean))];
    const container = forms.length
      ? forms
      : [document.querySelector('main,article,[role="main"]') || document.body];
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(el => cleanText(el.innerText)).filter(Boolean).join(' | ');
    // 保留换行以保持段落结构（不用 cleanText 压平），仅做长度截断
    const rawText = container.map(el => (el.innerText || '').replace(/\n{3,}/g, '\n\n').trim()).join('\n\n');
    const text = (rawText || document.body.innerText).slice(0, CONFIG.MAX_CONTEXT);
    return `${document.title}\n${headings}\n${text}`.trim();
  }
  // 用于指纹的稳定上下文：只取页面标题、标题树和 URL，不含任何表单字段值
  // 避免因字段填写/懒加载/骨架屏导致 contextHash 变化，方案被误判为过期
  function stableContext() {
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(el => cleanText(el.innerText)).filter(Boolean).join(' | ');
    return `${pageIdentity()}\n${headings}`.trim();
  }
  function fingerprints(fields) {
    const form = fields.map(field => `${field.key}|${field.label}|${field.fieldType}|${field.inputType}|${field.required}`).join('\n');
    return { formFingerprint: hash(form), contextHash: hash(stableContext()) };
  }
  // 页面方案只保存当前页面的 AI 候选，与资料和全局简历副本完全隔离。
  // key 由页面身份派生；读取时还会校验资料版本、页面指纹和有效期，不能跨页面复用。
  function getCachedPageSuggestions(fields) {
    try {
      const cached = JSON.parse(localStorage.getItem(planKey()) || 'null');
      const { formFingerprint, contextHash } = fingerprints(fields);
      if (!cached || cached.pageIdentity !== pageIdentity() || cached.profileVersion !== profileVersion()) return null;
      if (cached.formFingerprint !== formFingerprint || cached.contextHash !== contextHash) return null;
      if (!Array.isArray(cached.suggestions) || Date.now() - cached.timestamp > CONFIG.PLAN_TTL_MS) return null;
      return cached.suggestions;
    } catch (_) { return null; }
  }
  function cachePageSuggestions(fields, suggestions) {
    try {
      const { formFingerprint, contextHash } = fingerprints(fields);
      localStorage.setItem(planKey(), JSON.stringify({ pageIdentity: pageIdentity(), profileVersion: profileVersion(), formFingerprint, contextHash, timestamp: Date.now(), suggestions }));
    } catch (_) {}
  }
  const EXPERIENCE_SECTIONS = {
    education: { label: '教育经历', heading: /教育|学历|学业|学校|教育背景/i, resumeKey: 'education' },
    workExperience: { label: '工作经历', heading: /工作经历|工作经验|职业经历|从业|履历/i, resumeKey: 'workExperience' },
    internship: { label: '实习经历', heading: /实习/i, resumeKey: 'internship' },
    projectExperience: { label: '项目经历', heading: /项目经历|项目经验|项目/i, resumeKey: 'projectExperience' },
    campusExperience: { label: '校园经历', heading: /校园经历|学生工作|社团经历|学生组织|学生会|班委|实验室/i, resumeKey: 'campusExperience' },
    competitions: { label: '竞赛经历', heading: /竞赛经历|比赛经历|学科竞赛|竞赛获奖|比赛获奖/i, resumeKey: 'competitions' },
    volunteerExperience: { label: '志愿经历', heading: /志愿经历|志愿服务|公益经历|社会实践/i, resumeKey: 'volunteerExperience' },
    trainingExperience: { label: '培训经历', heading: /培训经历|职业培训|培训课程/i, resumeKey: 'trainingExperience' },
  };
  const ADD_ACTION_PATTERN = /添加|新增|增加|add|\+/i;
  const UNSAFE_ACTION_PATTERN = /提交|保存|确定|取消|删除|移除|上传|下载|搜索|查询|展开|收起|返回|下一步|上一步|预览|发布/i;
  function experienceCount(resume, type) {
    const items = resume?.[EXPERIENCE_SECTIONS[type]?.resumeKey]?.items;
    return Array.isArray(items) ? Math.min(items.length, 10) : 0;
  }
  function headingText(container) {
    return cleanText(container?.querySelector?.('h1,h2,h3,h4,h5,h6,[class*="section-title" i],[class*="group-title" i],[class*="form-title" i],[class*="block-title" i]')?.innerText);
  }
  function findExperienceContainer(type) {
    const definition = EXPERIENCE_SECTIONS[type];
    if (!definition) return null;
    const candidates = [...document.querySelectorAll('section,form,article,[role="group"],div')]
      .filter(element => definition.heading.test(headingText(element)))
      .filter(element => !isOwnNode(element));
    // 只接受最内层、且自身确实包含填写控件的区块，避免外层页面容器误命中。
    return candidates
      .filter(element => [...element.querySelectorAll('input,textarea,select')].some(isSupportedField))
      .sort((a, b) => a.querySelectorAll('input,textarea,select').length - b.querySelectorAll('input,textarea,select').length)[0] || null;
  }
  function fieldSignature(element) {
    const labels = [...element.querySelectorAll('input,textarea,select')]
      .filter(isSupportedField).map(field => cleanText(getLabel(field))).filter(Boolean).sort();
    return labels.length >= 2 ? labels.join('|') : '';
  }
  function countExperienceEntries(container) {
    if (!container) return 0;
    const fields = [...container.querySelectorAll('input,textarea,select')].filter(isSupportedField);
    if (!fields.length) return 0;
    const signatures = new Map();
    fields.forEach(field => {
      let node = field.parentElement;
      for (let depth = 0; node && node !== container && depth < 5; depth++, node = node.parentElement) {
        const signature = fieldSignature(node);
        if (!signature) continue;
        const siblings = [...node.parentElement.children].filter(sibling => fieldSignature(sibling) === signature);
        if (siblings.length >= 2) signatures.set(signature, siblings.length);
      }
    });
    return signatures.size ? Math.max(...signatures.values()) : 1;
  }
  function isExperienceAddButton(element, container, type) {
    if (isOwnNode(element) || element.disabled) return false;
    const text = cleanText(element.innerText || element.textContent || element.value || element.getAttribute('aria-label'));
    if (!text || text.length >= 40 || !ADD_ACTION_PATTERN.test(text) || UNSAFE_ACTION_PATTERN.test(text)) return false;
    const definition = EXPERIENCE_SECTIONS[type];
    // 按钮文本明确指向当前经历类型时可接受；“添加项目经历”等属于此类。
    if (definition.heading.test(text)) return true;
    // 只有泛化“添加/新增”时，按钮所在局部容器必须不含填写控件，避免误点标签、附件等输入项旁的添加按钮。
    let node = element.parentElement;
    for (let depth = 0; node && node !== container && depth < 3; depth++, node = node.parentElement) {
      if ([...node.querySelectorAll('input,textarea,select')].some(isSupportedField)) return false;
    }
    return true;
  }
  function findReliableAddButton(container, type) {
    if (!container || !EXPERIENCE_SECTIONS[type]?.heading.test(headingText(container))) return null;
    const buttons = [...container.querySelectorAll('button,a,[role="button"],input[type="button"]')]
      .filter(element => isExperienceAddButton(element, container, type));
    // 同一区块有多个候选“新增”动作时不猜测，直接降级为人工操作提示。
    return buttons.length === 1 ? buttons[0] : null;
  }
  function discoverExperienceGaps(resume) {
    return Object.keys(EXPERIENCE_SECTIONS).map(type => {
      const desired = experienceCount(resume, type);
      const container = findExperienceContainer(type);
      const current = container ? countExperienceEntries(container) : 0;
      const missing = Math.max(0, desired - current);
      const button = missing > 0 ? findReliableAddButton(container, type) : null;
      return { type, label: EXPERIENCE_SECTIONS[type].label, desired, current, missing, container, button,
        reason: !missing ? '' : !container ? '未识别到对应经历区块' : !button ? '未能可靠识别唯一的新增按钮' : '' };
    }).filter(item => item.desired > 0 && (item.missing > 0 || item.reason));
  }
  function wait(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }
  async function autoExpandExperienceGaps(resume) {
    const results = [];
    for (const gap of discoverExperienceGaps(resume)) {
      if (!gap.missing) continue;
      if (!gap.container || !gap.button) { results.push({ ...gap, status: 'skipped' }); continue; }
      let completed = 0;
      let stagnant = 0;
      while (completed < gap.missing && stagnant < 2) {
        const container = findExperienceContainer(gap.type);
        const before = countExperienceEntries(container);
        const button = findReliableAddButton(container, gap.type);
        if (!container || !button || before >= gap.desired) break;
        try { button.click(); } catch (_) { break; }
        await wait(500);
        const after = countExperienceEntries(findExperienceContainer(gap.type));
        if (after > before) { completed += after - before; stagnant = 0; } else stagnant++;
      }
      const finalCount = countExperienceEntries(findExperienceContainer(gap.type));
      results.push({ ...gap, completed: Math.min(completed, gap.missing), finalCount, status: finalCount >= gap.desired ? 'expanded' : 'partial' });
    }
    return results;
  }
  function summarizeExperienceExpansion(results) {
    const expanded = results.filter(item => item.status === 'expanded');
    const partial = results.filter(item => item.status === 'partial');
    const skipped = results.filter(item => item.status === 'skipped');
    const notes = [];
    if (expanded.length) notes.push(`已自动补齐：${expanded.map(item => `${item.label} ${item.completed} 组`).join('、')}`);
    if (partial.length) notes.push(`未完全补齐：${partial.map(item => `${item.label} ${item.finalCount || item.current}/${item.desired}`).join('、')}`);
    if (skipped.length) notes.push(`请手动补齐：${skipped.map(item => `${item.label}（${item.reason}）`).join('、')}`);
    return notes;
  }

  // ===== 页面分析与经历区块展开（batch 版移植，最小侵入）=====
  let lastAnalysis = null;

  function scanAddButtons() {
    const all = [...document.querySelectorAll('button, a, [role="button"], input[type="button"]')];
    return all.map((el, i) => {
      const text = cleanText(el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '');
      return { element: el, text, index: i };
    }).filter(({ text }) => {
      const hasAdd = /添加|新增|增加|Add|＋/i.test(text);
      const hasExclude = /提交|保存|确定|取消|删除|移除|上传|下载|搜索|查询|展开|收起|返回|下一步|上一步/i.test(text);
      return hasAdd && !hasExclude && text.length < 40;
    }).map(({ element, text, index }) => ({
      key: `add-btn-${index}`, element, text,
      section: getSectionLabel(element),
    }));
  }

  function getSectionLabel(element) {
    let el = element;
    for (let i = 0; i < 6 && el; i++) {
      const heading = el.querySelector?.('h1,h2,h3,h4');
      if (heading) return cleanText(heading.innerText);
      const prev = el.previousElementSibling;
      if (prev && /h[1-4]/i.test(prev.tagName)) return cleanText(prev.innerText);
      el = el.parentElement;
    }
    return '';
  }

  function inferSectionType(text) {
    if (/教育|学校|学历|学业/.test(text)) return 'education';
    if (/工作|职业|从业|履历/.test(text)) return 'workExperience';
    if (/实习/.test(text)) return 'internship';
    if (/项目/.test(text)) return 'projectExperience';
    return '';
  }

  const SECTION_CONTAINER_PATS = {
    education: /教育|学历|学业|学校/,
    workExperience: /工作|职业|从业|履历/,
    internship: /实习/,
    projectExperience: /项目/,
  };

  function fieldSignatureOf(el) {
    const fields = [...el.querySelectorAll('input,textarea,select')].filter(isSupportedField);
    if (!fields.length) return '';
    return fields.map(f => cleanText(getLabel(f))).sort().join('||');
  }

  function countEntryUnits(container) {
    if (!container) return 0;
    const allFields = [...container.querySelectorAll('input,textarea,select')].filter(isSupportedField);
    if (!allFields.length) return 0;
    for (const f of allFields) {
      let node = f.parentElement;
      while (node && node !== container && node !== document.body) {
        const parent = node.parentElement;
        if (parent && parent !== document.body) {
          const sig = fieldSignatureOf(node);
          if (sig) {
            const units = [...parent.children].filter(ch => fieldSignatureOf(ch) === sig);
            if (units.length > 1) return units.length;
          }
        }
        node = node.parentElement;
      }
    }
    return 1;
  }

  function countExistingEntries(sectionType) {
    const pat = SECTION_CONTAINER_PATS[sectionType];
    if (!pat) return 0;
    const sectionEls = [...document.querySelectorAll('section,form')].filter(el =>
      [...el.querySelectorAll('h1,h2,h3,h4,h5,h6')].some(h => pat.test(cleanText(h.innerText)))
    );
    for (const el of sectionEls) {
      const cnt = countEntryUnits(el);
      if (cnt > 0) return cnt;
    }
    const headingHolders = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(h => pat.test(cleanText(h.innerText)))
      .map(h => h.closest('section,form') || h.parentElement)
      .filter(Boolean);
    for (const el of headingHolders) {
      const cnt = countEntryUnits(el);
      if (cnt > 0) return cnt;
    }
    return 0;
  }

  function dedupeActions(actions) {
    return Object.values(
      (actions || []).reduce((map, a) => {
        const key = a.sectionType || a.buttonText;
        if (!map[key] || (a.desiredTotal || 0) > (map[key].desiredTotal || 0)) map[key] = a;
        return map;
      }, Object.create(null))
    );
  }

  async function aiInferActions(addButtons, resume) {
    if (!addButtons?.length || !resume) return [];
    if (!isAIAvailable()) return null;
    const buttonsInfo = addButtons.map((b, i) => {
      const sectionEl = b.element.closest('section,form') || b.element.parentElement;
      const heading = sectionEl ? sectionEl.querySelector('h1,h2,h3,h4') : null;
      const existing = sectionEl ? countEntryUnits(sectionEl) : 0;
      return `  ${i + 1}. 按钮文本："${b.text}"，所在区块标题："${cleanText(heading?.innerText) || b.section || '未知'}"，该区块当前已有 ${existing} 组经历框格`;
    }).join('\n');
    const experienceInfo = [];
    if (resume.education?.items?.length) experienceInfo.push(`教育经历：${resume.education.items.length}段`);
    if (resume.workExperience?.items?.length) experienceInfo.push(`工作经历：${resume.workExperience.items.length}段`);
    if (resume.internship?.items?.length) experienceInfo.push(`实习经历：${resume.internship.items.length}段`);
    if (resume.projectExperience?.items?.length) experienceInfo.push(`项目经历：${resume.projectExperience.items.length}段`);
    const prompt = [
      '你是招聘表单结构分析助手。当前页面有以下“添加”按钮，点击后会展开一组新的经历填写框格：',
      buttonsInfo,
      '',
      `用户简历中有：${experienceInfo.join('，') || '暂无经历数据'}`,
      '',
      '分析规则：',
      '1. 根据按钮文本和所在区块标题，判断每个按钮对应哪类经历（education/workExperience/internship/projectExperience）。',
      '2. 对比简历中该类经历的条数与该按钮所在区块已有的框格数，给出该区块最终应有的框格总数 desiredTotal（不是点击次数）。',
      '3. 若页面上已有框格数已达简历条数，desiredTotal 等于现有数量（无需点击）。',
      '4. 简历有实习经历但页面只有“工作经历”区块时，可将实习并入工作经历计算 desiredTotal。',
      '5. 按钮与任何经历类型都无关时不要输出该按钮。',
      '',
      '严格返回JSON（不要输出其他任何内容）：{"actions":[{"buttonText":"按钮文本","sectionType":"education|workExperience|internship|projectExperience","desiredTotal":数字,"reason":"简要说明"}]}',
      '如果不需要点击任何按钮，返回 {"actions":[]}。',
    ].join('\n');
    try {
      const raw = await window.LLMBridge.chat(prompt, { response_format: 'json' });
      let data;
      try { data = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) : raw; }
      catch (_) { data = null; }
      if (!Array.isArray(data?.actions)) return null;
      return data.actions
        .map(a => ({
          buttonText: cleanText(a?.buttonText || ''),
          sectionType: cleanText(a?.sectionType || ''),
          desiredTotal: Math.max(0, Math.min(15, Number(a?.desiredTotal) || 0)),
          reason: cleanText(a?.reason) || '',
        }))
        .filter(a => a.buttonText && a.desiredTotal > 0);
    } catch (e) {
      // console.warn('[简历填写助手] AI 推断添加按钮失败：', e);
      return null;
    }
  }

  function inferActions(addButtons, resume) {
    if (!addButtons?.length || !resume) return [];
    return addButtons.map(btn => {
      const text = btn.text;
      const sectionType = inferSectionType(text);
      if (!sectionType) return null;
      let resumeCount = (() => {
        if (sectionType === 'education') return Array.isArray(resume.education?.items) ? resume.education.items.length : 0;
        if (sectionType === 'workExperience') return Array.isArray(resume.workExperience?.items) ? resume.workExperience.items.length : 0;
        if (sectionType === 'internship') return Array.isArray(resume.internship?.items) ? resume.internship.items.length : 0;
        if (sectionType === 'projectExperience') return Array.isArray(resume.projectExperience?.items) ? resume.projectExperience.items.length : 0;
        return 0;
      })();
      let reasonPrefix = sectionType === 'education' ? '教育' : sectionType === 'workExperience' ? '工作' : sectionType === 'internship' ? '实习' : '项目';
      if (sectionType === 'workExperience' && resumeCount === 0) {
        const internCount = Array.isArray(resume.internship?.items) ? resume.internship.items.length : 0;
        if (internCount > 0) {
          resumeCount = internCount;
          reasonPrefix = '实习（映射到工作）';
        }
      }
      if (resumeCount <= 0) return null;
      const existingCount = countExistingEntries(sectionType);
      if (existingCount >= resumeCount) return null;
      const reason = `简历中有 ${resumeCount} 段${reasonPrefix}经历，页面已有 ${existingCount} 条，需补充至 ${resumeCount} 条`;
      return { buttonText: text, sectionType, desiredTotal: resumeCount, reason };
    }).filter(Boolean);
  }

  async function executeExpandActions(actions, addButtons) {
    for (const action of actions) {
      const btn = addButtons.find(b => b.text.includes(action.buttonText) || action.buttonText.includes(b.text));
      if (!btn?.element) continue;
      let sectionEl = btn.element.closest('section,form');
      if (!sectionEl && action.sectionType) {
        const pat = SECTION_CONTAINER_PATS[action.sectionType];
        if (pat) {
          sectionEl = [...document.querySelectorAll('section,form')].find(el =>
            [...el.querySelectorAll('h1,h2,h3,h4,h5,h6')].some(h => pat.test(cleanText(h.innerText)))
          );
        }
      }
      if (!sectionEl) continue;
      const desiredTotal = Math.max(0, Math.min(15, Number(action.desiredTotal) || 0));
      if (desiredTotal <= 0) continue;
      let clicks = 0, stagnant = 0;
      while (clicks < desiredTotal + 3 && stagnant < 2) {
        const current = countEntryUnits(sectionEl);
        if (current >= desiredTotal) {
          // console.log('[简历填写助手] 框格数已达标，停止点击：', action.buttonText, current, '>=', desiredTotal);
          break;
        }
        try { btn.element.click(); } catch (e) { /* console.warn('[简历填写助手] 点击添加按钮失败：', action.buttonText, e); */ break; }
        clicks++;
        await new Promise(r => setTimeout(r, 600));
        if (countEntryUnits(sectionEl) <= current) stagnant++; else stagnant = 0;
      }
      if (stagnant >= 2) { /* console.warn('[简历填写助手] 连续点击未新增框格，已停止：', action.buttonText); */ }
    }
  }

  function renderAnalysisReport(analysis) {
    lastAnalysis = analysis;
    ensureUI(); remove('.panel');
    const { resume, fields, addButtons, actions: rawActions } = analysis;
    const actions = dedupeActions(rawActions);
    const sectionNames = {
      education: '教育背景',
      workExperience: '工作经历',
      internship: '实习经历',
      projectExperience: '项目经验',
    };
    const cardsHtml = actions.map((action, idx) => {
      const name = sectionNames[action.sectionType] || action.buttonText;
      const existing = action.sectionType ? countExistingEntries(action.sectionType) : 0;
      const need = action.desiredTotal;
      const diff = Math.max(0, need - existing);
      const enough = diff <= 0;
      return `
        <div class="ar-card" data-section="${action.sectionType}">
          <div class="ar-card-header">
            <span class="ar-section-name">${escapeHtml(name)}${enough ? '<small class="ar-status">已足够</small>' : ''}</span>
            <span class="ar-count">页面 ${existing} 条 / 简历 ${need} 条</span>
          </div>
          <div class="ar-reason">${escapeHtml(action.reason || '')}</div>
          <div class="ar-card-body ar-btn-row">
            <button class="ar-add-btn ar-add-one" data-action-idx="${idx}">添加 1 条</button>
            <button class="ar-add-btn ar-add-batch" data-action-idx="${idx}">${enough ? '批量添加' : `批量添加 ${diff} 条`}</button>
          </div>
        </div>
      `;
    }).join('');
    const noActionsHtml = !actions?.length
      ? '<div class="ar-summary">未检测到需要添加的经历区块（页面已有框格数已满足简历条数，或未发现添加按钮）</div>'
      : '';
    const panel = node(`<section class="panel">
      <div class="panel-header">
        <button class="close">×</button>
        <h2>页面分析结果</h2>
        <p class="intro">已扫描 ${fields.length} 个字段，识别到 ${actions.length} 个需要展开的经历区块。点击下方按钮展开框格，或跳过直接查看字段匹配。</p>
      </div>
      <div class="panel-body">
        <h3 style="font-size:13px;color:#334155;margin:4px 0 10px">需补充的经历区块</h3>
        <div class="ar-sections">${cardsHtml}</div>
        ${noActionsHtml}
      </div>
      <div class="panel-footer">
        <div class="row">
          <button class="btn ghost ar-expand-all" ${!actions?.length ? 'disabled' : ''}>一键展开全部</button>
          <button class="btn ghost ar-skip">下一步</button>
        </div>
      </div>
    </section>`);
    panel.querySelector('.close').onclick = () => panel.remove();
    panel.querySelectorAll('.ar-add-one').forEach(btn => {
      btn.onclick = async () => {
        const idx = Number(btn.dataset.actionIdx);
        const action = actions[idx];
        if (!action) return;
        const current = action.sectionType ? countExistingEntries(action.sectionType) : 0;
        const singleAction = { ...action, desiredTotal: Math.min(action.desiredTotal, current + 1) };
        await executeExpandActions([singleAction], addButtons);
        const newFields = scanFields();
        renderAnalysisReport({ ...analysis, fields: newFields });
      };
    });
    panel.querySelectorAll('.ar-add-batch').forEach(btn => {
      btn.onclick = async () => {
        const idx = Number(btn.dataset.actionIdx);
        const action = actions[idx];
        if (!action) return;
        await executeExpandActions([action], addButtons);
        const newFields = scanFields();
        renderAnalysisReport({ ...analysis, fields: newFields });
      };
    });
    panel.querySelector('.ar-expand-all').onclick = async () => {
      const btn = panel.querySelector('.ar-expand-all');
      btn.disabled = true; btn.textContent = '展开中…';
      await executeExpandActions(actions, addButtons);
      const newFields = scanFields();
      renderAnalysisReport({ ...analysis, fields: newFields });
    };
    panel.querySelector('.ar-skip').onclick = async () => {
      panel.remove();
      invalidateCurrentPlan('经历区块已确认，重新生成页面方案');
      autoFill({ skipExpansion: true });
    };
    layer.appendChild(panel);
  }

  async function beginFillWithAnalysis() {
    const state = getResumeState();
    if (!state.resume) { setFabVisible(true); toast('请先在「简历资料」中保存资料并生成简历副本'); return; }
    const gaps = discoverExperienceGaps(state.resume);
    if (!gaps.some(g => g.missing > 0)) {
      autoFill();
      return;
    }
    toast('正在解析简历并分析页面…', 30000);
    const seq = ++analysisSeq;
    try {
      const resume = await parseResume(() => {});
      if (seq !== analysisSeq) return;
      const fields = scanFields();
      const addButtons = scanAddButtons();
      let actions = null;
      if (isAIAvailable()) {
        toast('正在用 AI 分析页面结构…', 15000);
        actions = await aiInferActions(addButtons, resume);
      }
      if (!actions || !actions.length) actions = inferActions(addButtons, resume);
      renderAnalysisReport({ resume, fields, addButtons, actions });
      const expandedMsg = actions?.length ? `，检测到 ${actions.length} 个需展开的区块` : '';
      setPlanState('valid', `已分析 ${fields.length} 个字段${expandedMsg}`);
      toast('分析完成，请在弹出面板中确认展开框格', 5000);
    } catch (error) {
      if (seq !== analysisSeq) return;
      toast('分析失败：' + (error && error.message || error), 5000);
    }
  }

function ensureUI() {
if (root?.isConnected) return;
// Shadow DOM 不会阻止重复 id；先清理旧版或重复执行留下的同名宿主节点。
document.querySelectorAll(`#${CSS.escape(CONFIG.ROOT_ID)}`).forEach(existing => existing.remove());
root = document.createElement('div'); root.id = CONFIG.ROOT_ID;

    root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;';
    shadow = root.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host{all:initial}.rf,*{box-sizing:border-box}.rf{color:#202846}.fab,.fab-ball,.fab-menu,.panel,.toast,.quick-card{pointer-events:auto}.fab-stack{position:fixed;width:52px;height:52px;z-index:1}.fab-ball{position:absolute;right:0;bottom:0;width:52px;height:52px;border:0;border-radius:17px;background:linear-gradient(135deg,#4b82ff 0%,#705dff 55%,#9d40ff 100%);color:#fff;box-shadow:0 10px 24px rgba(90,83,226,.34),inset 0 1px 0 rgba(255,255,255,.25);font-size:12px;font-weight:750;letter-spacing:.03em;cursor:grab;touch-action:none;user-select:none;transition:transform .16s,box-shadow .16s}.fab-ball:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(90,83,226,.42),inset 0 1px 0 rgba(255,255,255,.25)}.fab-ball:active{cursor:grabbing}.fab-menu{position:absolute;right:0;bottom:62px;display:flex;flex-direction:column;gap:8px;min-width:106px;opacity:0;transform:translateY(8px) scale(.96);transform-origin:bottom right;pointer-events:none;transition:opacity .16s ease,transform .16s ease}.fab-stack.expanded .fab-menu{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}.fab-stack.menu-down .fab-menu{top:62px;bottom:auto;transform-origin:top right}.fab{border:1px solid rgba(222,226,247,.9);border-radius:11px;background:rgba(255,255,255,.97);color:#4d5580;padding:10px 13px;box-shadow:0 8px 22px rgba(56,65,132,.14);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .16s,color .16s,transform .16s}.fab:hover{background:#f3f5ff;color:#5148db;transform:translateY(-1px)}.panel{position:fixed;right:16px;top:16px;bottom:16px;width:470px;max-width:calc(100vw - 32px);background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(248,249,255,.98));border:1px solid rgba(220,224,241,.92);border-radius:20px;box-shadow:0 20px 56px rgba(48,58,111,.2),0 4px 16px rgba(31,41,85,.07);overflow:auto;padding:20px;scrollbar-width:thin;scrollbar-color:#d8def6 transparent}.panel:before{content:"";display:block;height:3px;margin:-20px -20px 17px;border-radius:20px 20px 0 0;background:linear-gradient(90deg,#4e7cff,#7565ff 50%,#a13cff)}.panel h2{font-size:19px;letter-spacing:.01em;margin:0 35px 7px 0;color:#222c50}.panel .profile-title{display:flex;align-items:center;gap:10px}.panel .profile-title-icon{display:grid;place-items:center;flex:0 0 auto;width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#eef1ff,#f6ecff);color:#705dff;box-shadow:inset 0 1px 0 rgba(255,255,255,.8);font-size:22px;line-height:1}.panel .profile-title-text{display:block}.panel h3{font-size:14px;margin:18px 0 8px}.close{position:absolute;right:15px;top:15px;display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:9px;background:transparent;color:#7d86a5;font-size:21px;cursor:pointer;transition:background .16s,color .16s}.close:hover{background:#eef1ff;color:#5046db}.intro,.hint,.status,.privacy{font-size:12px;line-height:1.65;color:#79819e}.privacy{background:#f5f3ff;color:#6653a9;padding:10px 11px;border:1px solid #e6e1ff;border-radius:10px}.status{padding:10px 11px;border:1px solid #e6eaf7;border-radius:10px;background:#f7f8fd;margin:12px 0;color:#727b99}.status.loading{background:#eef3ff;border-color:#dce5ff;color:#3e62bb}.status.error{background:#fff3f5;border-color:#ffdce3;color:#bd465e}.status.ok{background:#effbf5;border-color:#d6f2e2;color:#2d8a5b}.btn{border:0;border-radius:9px;padding:9px 12px;cursor:pointer;font-size:13px;font-weight:700;background:linear-gradient(100deg,#4e82ff,#765eff 56%,#a03dff);color:#fff;box-shadow:0 6px 14px rgba(96,85,235,.22);transition:transform .16s,box-shadow .16s,background .16s}.btn:hover{background:linear-gradient(100deg,#4378f9,#684fff 56%,#9530f5);box-shadow:0 8px 18px rgba(96,85,235,.3);transform:translateY(-1px)}.btn.ghost{background:#fff;color:#596384;border:1px solid #e1e6f4;box-shadow:none}.btn.ghost:hover{background:#f3f5ff;color:#5148da;border-color:#d8defe}.btn:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}.row{display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap}.row-spacer{flex:1 1 auto}.select-all{display:inline-flex;align-items:center;gap:6px;min-height:36px;color:#596384;font-size:13px;font-weight:700;line-height:1;white-space:nowrap;cursor:pointer;user-select:none}.select-all input{width:16px;height:16px;margin:0;accent-color:#705dff;cursor:pointer}.plan-item{display:flex;gap:9px;padding:11px 0;border-top:1px solid #edf0fa}.plan-item input{margin-top:3px}.plan-item b{display:block;font-size:13px}.plan-item span{display:block;font-size:12px;color:#79819e;line-height:1.5;margin-top:3px;white-space:pre-wrap}.badge{display:inline-block;border-radius:10px;padding:2px 6px;font-size:11px;background:#f0f2fb;color:#68718f;margin-left:5px}.badge.rule{background:#effbf5;color:#2d8a5b}.badge.ai{background:#f1edff;color:#705ac3}.import{margin:12px 0;padding:11px;border:1px dashed #cfd6ef;border-radius:11px;background:#fafbff}.import label{display:block;font-size:13px;font-weight:650}.import input{display:block;width:100%;margin:7px 0;font-size:12px}.profile{width:100%;height:250px;resize:vertical;border:1px solid #dfe4f2;border-radius:12px;background:rgba(255,255,255,.88);padding:11px 12px;color:#303958;outline:none;font:13px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;transition:border-color .16s,box-shadow .16s}.profile:focus{border-color:#8e87ff;box-shadow:0 0 0 3px rgba(112,93,255,.12)}.panel.profile-panel{display:flex;flex-direction:column;overflow:hidden}.profile-panel .profile-panel-header,.profile-panel .profile-panel-footer{flex:0 0 auto}.profile-panel .profile{flex:1 1 auto;min-height:280px;height:auto;resize:none}.profile-panel .profile-panel-footer{padding-top:12px}.profile-panel .privacy{margin:0}.profile-panel .profile-actions{margin-top:10px;gap:4px;flex-wrap:nowrap}.profile-panel .profile-actions .btn{flex:1 1 0;white-space:nowrap;padding:8px 6px;font-size:11px}.toast{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:linear-gradient(100deg,#39477d,#6253ce);color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:11px;padding:10px 13px;font-size:12px;box-shadow:0 10px 26px rgba(62,69,144,.28)}.quick-card{position:fixed;z-index:999;display:block;line-height:1.35;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(248,249,255,.96));border:1px solid rgba(220,224,241,.92);border-radius:16px;box-shadow:0 18px 48px rgba(48,58,111,.18),0 3px 12px rgba(31,41,85,.08);overflow:hidden;min-width:280px;max-width:380px;color:#202846}.quick-card:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#4e7cff 0%,#7565ff 50%,#a13cff 100%)}.quick-card .qc-head{position:relative;display:flex;justify-content:space-between;align-items:center;padding:15px 14px 11px;border-bottom:1px solid #edf0fa;background:linear-gradient(110deg,#f7f9ff 0%,#fff 58%,#fbf8ff 100%)}.quick-card .qc-head:before{content:"✦";display:grid;place-items:center;width:25px;height:25px;margin-right:8px;border-radius:8px;background:linear-gradient(135deg,#e9edff,#f3e8ff);color:#6b5cff;font-size:15px;line-height:1}.quick-card .qc-title{flex:1;font-size:13px;font-weight:750;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quick-card .qc-actions{display:flex;align-items:center;gap:3px;margin-left:8px}.quick-card .qc-refresh,.quick-card .qc-close{display:grid;place-items:center;width:25px;height:25px;padding:0;border:0;border-radius:8px;background:transparent;color:#7d86a5;font-size:19px;cursor:pointer;line-height:1;transition:background .16s,color .16s,transform .16s}.quick-card .qc-refresh{font-size:16px}.quick-card .qc-refresh:hover,.quick-card .qc-close:hover{background:#eef1ff;color:#5046db}.quick-card .qc-refresh:disabled{opacity:.55;cursor:not-allowed}.quick-card .qc-refresh.loading{animation:qc-spin .75s linear infinite}@keyframes qc-spin{to{transform:rotate(360deg)}}.quick-card .qc-body{display:block;padding:7px 8px 2px;min-height:0;max-height:280px;overflow:auto;scrollbar-width:thin;scrollbar-color:#d8def6 transparent}.quick-card .qc-item{position:relative;margin:4px 0;padding:10px 38px 10px 39px;border:1px solid transparent;border-radius:10px;cursor:pointer;transition:background .16s,border-color .16s,box-shadow .16s,transform .16s}.quick-card .qc-item:before{content:"◇";position:absolute;left:12px;top:11px;display:grid;place-items:center;width:19px;height:19px;border-radius:6px;background:#f0f3ff;color:#5d65ee;font-size:14px;font-weight:700}.quick-card .qc-item:hover{background:#f7f8ff;border-color:#dce1ff;box-shadow:0 5px 14px rgba(86,95,215,.1);transform:translateY(-1px)}.quick-card .qc-value{font-size:13px;font-weight:620;line-height:1.42;white-space:pre-wrap;word-break:break-word;color:#293250}.quick-card .qc-meta{font-size:11px;color:#8b93ad;margin:3px 0 0;line-height:1.35}.quick-card .qc-empty{margin:7px 0;padding:21px 14px;border:1px dashed #dbe0f3;border-radius:10px;background:#fafbff;text-align:center;color:#8b93ad;font-size:12px}.quick-card .qc-footer{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:10px 12px 11px;border-top:1px solid #edf0fa;background:linear-gradient(180deg,#fff,#fafbff);font-size:11px;color:#8b93ad}.quick-card .qc-ai-gen{grid-column:1/-1;order:-1;background:linear-gradient(100deg,#4e82ff,#765eff 56%,#a03dff);color:#fff;box-shadow:0 6px 14px rgba(96,85,235,.24)}.quick-card .qc-compress-current,.quick-card .qc-save-profile{margin:0;background:#fff;color:#536080;border:1px solid #e4e8f5}.quick-card .qc-ai-gen,.quick-card .qc-compress-current,.quick-card .qc-save-profile{display:block;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;transition:transform .16s,box-shadow .16s,background .16s,color .16s;border:0}.quick-card .qc-ai-gen:hover{background:linear-gradient(100deg,#4378f9,#684fff 56%,#9530f5);box-shadow:0 8px 18px rgba(96,85,235,.3);transform:translateY(-1px)}.quick-card .qc-compress-current:hover,.quick-card .qc-save-profile:hover{background:#f3f5ff;color:#5148da;border-color:#d9defe}.quick-card .qc-ai-gen:disabled,.quick-card .qc-compress-current:disabled,.quick-card .qc-save-profile:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}.quick-card .qc-item.used{opacity:.52}.quick-card .qc-used-tag{display:inline-block;margin-left:5px;font-size:10px;color:#7a61c8;background:#f1edff;border-radius:5px;padding:1px 5px}.quick-card .qc-compress{position:absolute;right:9px;top:9px;border:0;border-radius:5px;background:#eef1ff;color:#5e62db;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;transition:background .16s}.quick-card .qc-compress:hover{background:#dfe4ff}.quick-card .qc-compress:disabled{opacity:.55;cursor:not-allowed}.quick-card .qc-limit{color:#c47713;font-weight:650}@media(max-width:420px){.quick-card{min-width:min(280px,calc(100vw - 16px));max-width:calc(100vw - 16px)}}@media(max-width:560px){.panel{right:8px;left:8px;top:8px;bottom:8px;width:auto;max-width:none}.fab{padding:11px 12px}}.ar-sections{display:flex;flex-direction:column;gap:12px}.ar-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px}.ar-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.ar-section-name{font-weight:600;font-size:14px}.ar-status{color:#94a3b8;font-weight:400;margin-left:6px;font-size:12px}.ar-count{font-size:12px;color:#64748b}.ar-reason{font-size:12px;color:#64748b;margin:0 0 10px;line-height:1.5}.ar-btn-row{display:flex;gap:8px}.ar-btn-row .ar-add-one{flex:1}.ar-btn-row .ar-add-batch{flex:1}.ar-add-btn{padding:10px;border:1px solid #bae6fd;border-radius:8px;background:#f0f9ff;color:#0369a1;font-size:13px;font-weight:500;cursor:pointer}.ar-add-btn:hover{background:#e0f2fe}.ar-summary{margin-top:14px;padding:10px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#166534}.ar-expand-all{margin-right:auto}
    </style><div id="layer" class="rf"></div>`;
layer = shadow.getElementById('layer'); document.documentElement.appendChild(root);
// 旧版脚本若在 v4 之后初始化，会再次插入同名宿主节点；观察并移除非当前实例，确保页面只显示一组悬浮控件。
duplicateRootObserver?.disconnect();
duplicateRootObserver = new MutationObserver(records => {
for (const record of records) {
for (const added of record.addedNodes) {
if (added.nodeType !== Node.ELEMENT_NODE) continue;
const hosts = [];
if (added.id === CONFIG.ROOT_ID) hosts.push(added);
if (added.querySelectorAll) hosts.push(...added.querySelectorAll(`#${CSS.escape(CONFIG.ROOT_ID)}`));
hosts.filter(host => host !== root).forEach(host => host.remove());
}
}
});
duplicateRootObserver.observe(document.documentElement, { childList: true, subtree: true });
renderFab();
}
  function node(html) { const holder = document.createElement('div'); holder.innerHTML = html.trim(); return holder.firstElementChild; }
  function setFabVisible(visible) {
    const stack = layer?.querySelector('.fab-stack');
    if (stack) stack.hidden = !visible;
  }
  function closePanel(panel) {
    if (!panel?.isConnected) return;
    panel.remove();
    setFabVisible(true);
  }
  function remove(selector) { layer.querySelector(selector)?.remove(); }
  function toast(message, duration = 3000) { ensureUI(); remove('.toast'); const el = node(`<div class="toast">${escapeHtml(message)}</div>`); layer.appendChild(el); setTimeout(() => el.remove(), duration); }
  function setPlanState(status, reason) { planState = { status, reason }; }
  function clampFabPosition(position) {
    const ballSize = 52;
    const margin = 8;
    return {
      x: Math.min(Math.max(Number(position?.x) || 0, margin), Math.max(margin, window.innerWidth - ballSize - margin)),
      y: Math.min(Math.max(Number(position?.y) || 0, margin), Math.max(margin, window.innerHeight - ballSize - margin)),
    };
  }
  function getFabPosition() {
    if (fabPosition) return clampFabPosition(fabPosition);
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.FLOATING_BALL_POSITION_KEY) || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return clampFabPosition(saved);
    } catch (_) {}
    return clampFabPosition({ x: window.innerWidth - 70, y: window.innerHeight - 72 });
  }
  function saveFabPosition(position) {
    fabPosition = clampFabPosition(position);
    try { localStorage.setItem(CONFIG.FLOATING_BALL_POSITION_KEY, JSON.stringify(fabPosition)); } catch (_) {}
  }
  function applyFabPosition(stack, position) {
    const next = clampFabPosition(position);
    stack.style.left = `${next.x}px`;
    stack.style.top = `${next.y}px`;
    stack.classList.toggle('menu-down', next.y < 130);
  }
  function renderFab() {
    if (!layer) return;
    remove('.fab-stack');
    const position = getFabPosition();
    fabPosition = position;
    const stack = node(`<div class="fab-stack${fabExpanded ? ' expanded' : ''}"><div class="fab-menu"><button class="fab" data-act="profile">简历资料</button><button class="fab" data-act="fill">一键录入</button></div><button class="fab-ball" type="button" data-act="toggle" aria-label="展开简历秒填助手" aria-expanded="${fabExpanded}">秒填</button></div>`);
    applyFabPosition(stack, position);
    let suppressToggle = false;
    stack.onclick = (e) => {
      const action = e.target.dataset.act;
      if (action === 'toggle' && suppressToggle) {
        suppressToggle = false;
        return;
      }
      if (action === 'toggle') {
        fabExpanded = !fabExpanded;
        stack.classList.toggle('expanded', fabExpanded);
        e.target.setAttribute('aria-expanded', String(fabExpanded));
      } else if (action === 'profile') {
        fabExpanded = false;
        stack.classList.remove('expanded');
        stack.querySelector('.fab-ball').setAttribute('aria-expanded', 'false');
        setFabVisible(false);
        renderProfilePanel();
      } else if (action === 'fill') {
        fabExpanded = false;
        stack.classList.remove('expanded');
        stack.querySelector('.fab-ball').setAttribute('aria-expanded', 'false');
        setFabVisible(false);
        beginFillWithAnalysis();
      }
    };
    const ball = stack.querySelector('.fab-ball');
    let pointerStart = null;
    let dragged = false;
    ball.addEventListener('pointerdown', event => {
      pointerStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: fabPosition.x, top: fabPosition.y };
      dragged = false;
      ball.setPointerCapture(event.pointerId);
    });
    ball.addEventListener('pointermove', event => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragged = true;
      if (!dragged) return;
      fabPosition = clampFabPosition({ x: pointerStart.left + dx, y: pointerStart.top + dy });
      applyFabPosition(stack, fabPosition);
    });
    ball.addEventListener('pointerup', event => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
      if (ball.hasPointerCapture(event.pointerId)) ball.releasePointerCapture(event.pointerId);
      if (dragged) {
        saveFabPosition(fabPosition);
        suppressToggle = true;
        event.preventDefault();
      }
      pointerStart = null;
    });
    ball.addEventListener('pointercancel', () => { pointerStart = null; });
    layer.appendChild(stack);
  }
    function evaluatePlanState(removeExpired = true) {
    const state = getResumeState();
    if (!state.resume) return { status: 'missing', reason: '尚未生成简历副本', cached: null };
    const currentReason = state.source === 'demo' ? '内置演示简历副本有效' : '简历副本有效';
    return { status: state.freshness === 'current' ? 'valid' : 'stale', reason: state.freshness === 'current' ? currentReason : '正在使用上一版简历副本', cached: { resume: state.resume } };
  }
  function syncPlanState() {
    const state = evaluatePlanState(); setPlanState(state.status, state.reason); return state;
  }
  function invalidateCurrentPlan(reason = '个人简历资料已更新') { setPlanState('stale', reason); }

  // 副本使用 stale-while-revalidate：资料更新后旧副本仍可供填写，新副本成功后再原子替换。
  function getResumeState() {
    try {
      const raw = localStorage.getItem(CONFIG.ULTIMATE_RESUME_KEY);
      if (!raw) {
        // 仅在该站点没有保存过资料时使用内存 demo；主动清空后维持空状态，不会自动恢复 demo。
        return hasStoredProfile()
          ? { resume: null, freshness: 'missing' }
          : { resume: createDefaultDemoResume(), freshness: 'current', source: 'demo' };
      }
      const cached = JSON.parse(raw);
      if (!cached.resume) return { resume: null, freshness: 'missing' };
      const isCurrentSchema = cached.schemaVersion === CONFIG.RESUME_SCHEMA_VERSION;
      return { resume: cached.resume, freshness: cached.profileVersion === profileVersion() && isCurrentSchema ? 'current' : 'stale' };
    } catch (_) {
      // localStorage 不可用时，新用户可降级为只读内存 demo；已有资料则不覆盖为 demo，避免掩盖异常缓存。
      return hasStoredProfile()
        ? { resume: null, freshness: 'missing' }
        : { resume: createDefaultDemoResume(), freshness: 'current', source: 'demo' };
    }
  }
  // 用于录入，允许读取正在刷新中的上一版副本。
  function getResume() { return getResumeState().resume; }
  // 仅用于版本追平判断、导出与可信导入逻辑。
  function getCurrentResume() {
    const state = getResumeState();
    return state.freshness === 'current' ? state.resume : null;
  }
  function setResume(resume) {
    try { localStorage.setItem(CONFIG.ULTIMATE_RESUME_KEY, JSON.stringify({ resume, profileVersion: profileVersion(), schemaVersion: CONFIG.RESUME_SCHEMA_VERSION })); } catch (_) {}
  }
  function clearResume() {
    try { localStorage.removeItem(CONFIG.ULTIMATE_RESUME_KEY); } catch (_) {}
  }
  function isCompatibleResume(resume) {
    if (!resume || typeof resume !== 'object' || Array.isArray(resume)) return false;
    // 仅校验字段结构，不要求值非空：缺少事实应保持 null，不能因兼容性校验而诱导 AI 编造。
    const requiredFields = {
      personal: ['fullName', 'englishName', 'hometown', 'hukouLocation', 'currentEmploymentStatus'],
      jobIntention: ['targetPosition', 'targetIndustry', 'relocationPreference', 'travelWillingness'],
      education: ['school', 'college', 'educationLevel', 'degreeName', 'expectedGraduationDate', 'researchDirection', 'schoolLocation', 'graduationMethod'],
      workExperience: ['company', 'companyNature', 'industry', 'position', 'jobLevel'],
      internship: ['company', 'internshipType', 'position'],
      campusExperience: ['organization', 'studentCadreRole', 'campusDetail'],
      competitions: ['competitionName', 'awardName', 'competitionDetail'],
      volunteerExperience: ['organization', 'role', 'volunteerDetail'],
      trainingExperience: ['trainingName', 'provider', 'trainingDetail', 'certificate'],
    };
    const templateModules = Object.keys(RESUME_TEMPLATE);
    return templateModules.every(key => {
      const module = resume[key];
      if (!module || typeof module !== 'object') return false;
      if (module.fields && typeof module.fields === 'object') {
        return (requiredFields[key] || []).every(fieldKey => Array.isArray(module.fields[fieldKey]?.aliases));
      }
      if (module.isRepeatable === true && Array.isArray(module.items)) {
        return module.items.every(item => (requiredFields[key] || []).every(fieldKey => Array.isArray(item?.[fieldKey]?.aliases)));
      }
      return false;
    });
  }
  function buildProfilePackage() {
    return {
      format: CONFIG.PROFILE_PACKAGE_FORMAT,
      formatVersion: CONFIG.PROFILE_PACKAGE_VERSION,
      exportedAt: new Date().toISOString(),
      profile: getProfile(),
      resume: getCurrentResume(),
    };
  }
  function downloadProfilePackage() {
    const profile = getProfile();
    if (!profile) throw new Error('暂无简历资料可导出');
    const content = JSON.stringify(buildProfilePackage(), null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url; link.download = `简历资料包_${date}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  async function importProfilePackage(file) {
    if (!file) throw new Error('请先选择资料包文件');
    if (file.size > CONFIG.MAX_PROFILE_PACKAGE_BYTES) throw new Error('资料包超过 1 MB，无法导入');
    let data;
    try { data = JSON.parse(await readTextFile(file)); } catch (_) { throw new Error('资料包不是有效的 JSON 文件'); }
    if (!data || data.format !== CONFIG.PROFILE_PACKAGE_FORMAT || typeof data.profile !== 'string') throw new Error('不是有效的简历资料包');
    if (!data.profile.trim()) throw new Error('资料包中没有原始简历资料');
    if (data.profile.length > CONFIG.MAX_PROFILE) throw new Error('资料包中的原始简历资料超过当前可保存上限');
    const isCurrentVersion = data.formatVersion === CONFIG.PROFILE_PACKAGE_VERSION;
    const resumeValid = isCurrentVersion && isCompatibleResume(data.resume);
    return { profile: data.profile, resume: resumeValid ? data.resume : null, resumeValid, reason: !isCurrentVersion ? '资料包版本较旧' : '资料包中的简历副本结构不完整' };
  }
  // 三条资料写入链路统一规则：资料内容变更才推进版本；副本版本追平后才可用。
  function applyImportedProfilePackage(pkg) {
    const profileChanged = setProfile(pkg.profile);
    if (pkg.resumeValid) {
      // 合法导入包的副本直接绑定当前站点的资料版本，导入后立即追平可用。
      setResume(pkg.resume);
      setPlanState('valid', '已导入简历资料和副本');
      return { profileChanged, resumeReady: true, needsRebuild: false };
    }
    // 不可信副本不能随资料变更继续使用；但若资料未变，不应破坏当前已验证的有效副本。
    if (profileChanged) clearResume();
    const resumeReady = !!getCurrentResume();
    setPlanState(resumeReady ? 'valid' : 'missing', resumeReady ? '原始资料未变，保留当前简历副本' : '已导入原始简历资料，需重新生成副本');
    return { profileChanged, resumeReady, needsRebuild: !resumeReady };
  }
  function parseResumePrompt(profile) {
    return [
      '你是简历结构化解析助手。请基于用户简历资料，按下方最全简历模板结构提取并填充 JSON。只使用资料中已有的事实，不得编造；资料没提到的字段留 null 或空数组。',
      '规则：①每段经历（教育/工作/项目/实习/校园/竞赛/志愿/培训等）保留原始事实，有几段就存几段，不得合并、遗漏或拆分；未出现该类经历时，对应模块的 items 必须为 []，不得保留模板中的空白示例项。教育经历中学院/院系填 college，学校名称填 school；学历填 educationLevel，学位填 degreeName，二者不得混填。②描述类字段填一段连贯文本字符串，不拆成数组。projectExperience.projectDetail 合并项目背景+职责+成果、workExperience.workDetail 合并工作职责+成果、internship.internDetail 合并实习内容+成果，各为一段连贯描述。③敏感字段（idCard/photo/salary/weChat 等）资料有则填、无则 null。④selfEvaluation.summary 仅能提炼资料已明确表达的自我介绍或优势，无依据则空。⑤保留每个 field 的 aliases 不变，只填 value。',
      '严格防止过度拟合：字段值必须有直接、明确且同语义的资料依据；资料没有明确写出的字段一律为 null 或空数组。不得根据公司名称推断行业/单位性质，不得根据职位名称推断职级，不得根据在职时间或“至今”推断当前在职状态，不得根据学校名称推断学校所在地，不得将毕业时间复制为预计毕业时间，不得将中文姓名音译为英文名，不得根据普通经历猜测异地/出差意愿或期望行业。籍贯(hometown)与户口所在地(hukouLocation)互不推断；工作职位(position)与职级(jobLevel)互不推断；校园/竞赛/志愿/培训经历只能填入对应模块，不能从其他模块复制事实。',
      '严格返回 JSON（不要输出其他任何内容），结构严格按下方模板，每个 field 保留 aliases 不变，只填 value：',
      '【最全简历模板（aliases 不可改，只填 value）】',
      JSON.stringify(RESUME_TEMPLATE),
      '【用户简历资料】',
      profile,
    ].join('\n');
  }
  async function parseResume(onStatus) {
    const profile = getProfile();
    if (!profile) throw new Error('请先在"管理简历资料"中录入或上传简历');
    if (!isAIAvailable()) throw new Error('未检测到 Tabbit AI，无法进行分析');
    if (onStatus) onStatus(`正在用 AI 解析简历…`);
    const prompt = parseResumePrompt(profile);
    /* console.group('[简历填写助手] 发送给 AI 的提示词');
    console.log(prompt);
    console.groupEnd(); */
    const raw = await window.LLMBridge.chat(prompt, { response_format: 'json' });
    let data;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) : raw;
    } catch (_) {
      data = null;
    }
    if (!data) throw new Error('AI 返回内容无法解析为 JSON');
    if (!isCompatibleResume(data)) throw new Error('AI 返回的简历副本结构不完整，请重试');
    /* console.group('[简历填写助手] 最全简历副本已解析');
    console.log(data);
    console.groupEnd(); */
    return data;
  }
  function normalizeDateValue(value, inputType) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const match = text.match(/(\d{4})\s*[年.\-/]\s*(\d{1,2})(?:\s*[月.\-/]\s*(\d{1,2}))?/);
    const pad = number => String(Number(number)).padStart(2, '0');
    if (inputType === 'month') {
      if (match) return `${match[1]}-${pad(match[2])}`;
      const year = text.match(/^(\d{4})年?$/);
      return year ? `${year[1]}-01` : '';
    }
    if (inputType === 'date' || inputType === 'datetime-local') {
      if (!match) return '';
      const date = `${match[1]}-${pad(match[2])}-${pad(match[3] || 1)}`;
      return inputType === 'datetime-local' ? `${date}T00:00` : date;
    }
    return text;
  }
  function inferValueFormat(field) {
    const meta = `${field.label || ''} ${field.element?.name || ''} ${field.element?.id || ''}`.toLowerCase();
    if (/邮箱|e-?mail|邮件/.test(meta)) return 'email';
    if (/手机|电话|phone|tel|mobile/.test(meta)) return 'phone';
    return field.inputType;
  }
  function isValidFieldValue(field, value) {
    const text = String(value || '').trim();
    if (!text) return false;
    const format = inferValueFormat(field);
    if (format === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    if (format === 'phone') return /^\+?[\d\s-]{7,20}$/.test(text);
    if (format === 'month') return /^\d{4}-(0[1-9]|1[0-2])$/.test(text);
    if (format === 'date') return /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(text);
    if (format === 'datetime-local') return /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/.test(text);
    if (format === 'number') return Number.isFinite(Number(text));
    return true;
  }
  function resolveSelectOption(element, value) {
    const text = cleanText(value);
    return [...element.options].find(option => option.value === text || cleanText(option.text) === text) || null;
  }
  function setNativeValue(element, value) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'select') {
      const option = resolveSelectOption(element, value);
      if (!option) return false;
      element.focus();
      element.value = option.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      return element.value === option.value;
    }
    const inputType = (element.type || '').toLowerCase();
    const nextValue = ['month', 'date', 'datetime-local'].includes(inputType) ? normalizeDateValue(value, inputType) : String(value ?? '');
    if (!nextValue) return false;
    const proto = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    if (nativeSetter) nativeSetter.call(element, nextValue); else element.value = nextValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    return element.value === nextValue;
  }
  function buildSafeFillPlan(resume, fields = scanFields(), pageSuggestions = []) {
    const usedValues = new Set();
    const items = [];
    const suggestionByKey = new Map(pageSuggestions.map(item => [item.key, item]));
    fields.forEach(field => {
      const localCandidates = matchField(field, resume, fields).map(candidate => ({ ...candidate, source: 'local', defaultSelected: candidate.confidence === 'high' }));
      const cached = suggestionByKey.get(field.key);
      // 页面级 AI 建议没有经过字段级语义复核，即使标为高置信度也只能由用户显式确认。
      const candidates = cached ? [...localCandidates, { ...cached, source: 'ai', defaultSelected: false }] : localCandidates;
      for (const candidate of candidates) {
        const normalized = ['month', 'date', 'datetime-local'].includes(field.inputType) ? normalizeDateValue(candidate.value, field.inputType) : candidate.value;
        if (!normalized || usedValues.has(normalized) || !isValidFieldValue(field, normalized)) continue;
        if (field.inputType === 'select' && !resolveSelectOption(field.element, normalized)) continue;
        usedValues.add(normalized);
        items.push({ field, value: String(normalized).slice(0, 3000), occupied: !!cleanText(field.element.value), source: candidate.source, reason: candidate.reason || '', confidence: candidate.confidence || 'high', defaultSelected: candidate.defaultSelected });
        break;
      }
    });
    return { fields, items };
  }
function compactResumeValues(resume) {
const output = {};
const compactFields = (fields) => Object.fromEntries(Object.entries(fields || {})
  // AI 生成不需要身份证、薪资等敏感资料；不将这些内容发送给模型。
  .filter(([, field]) => !field?.sensitive)
  .map(([key, field]) => [key, field?.value ?? null]));
Object.entries(resume || {}).forEach(([module, value]) => {
if (value?.isRepeatable && Array.isArray(value.items)) output[module] = value.items.map(item => compactFields(item));
else if (value?.fields) output[module] = compactFields(value.fields);
});
return output;
}
  async function generatePageSuggestions(fields, resume, localPlan) {
    const matchedKeys = new Set(localPlan.items.map(item => item.field.key));
    const targets = fields.filter(field => !matchedKeys.has(field.key)).map(field => ({
      key: field.key,
      context: getFieldAIContext(field, fields),
    }));
    if (!targets.length || !isAIAvailable()) return [];
    const fieldsInfo = targets.map((target, index) => {
      const context = target.context;
      const options = context.options.map(option => option.text || option.value).filter(Boolean);
      return `  ${index}. 字段："${context.label}"；直接提示：${context.directHints.join(' / ') || '无'}；所在区块：${context.section || '无'}；控件：${context.inputType}${options.length ? `；可选值：${options.join(' / ')}` : ''}`;
    }).join('\n');
    const prompt = [
      '你是招聘表单填写助手。请仅为下列本地规则未匹配的字段提供候选值。', fieldsInfo, '',
      '规则：1. 仅使用简历中已有的、直接且同语义的事实，不得编造、扩写、归纳或跨字段推断。2. 字段标签、直接提示或所在区块不够明确时，返回空，不可凭值相近或常识猜测。3. 不得用公司名称推断行业/单位性质、用职位推断职级、用学校推断所在地、用毕业时间推断预计毕业时间、用姓名推断英文名；籍贯与户口所在地、期望行业与工作所属行业、职位与职级、工作/实习/校园/竞赛/志愿/培训经历均不得互相迁移。4. 下拉框必须精确选择给定可选值之一。5. month 输出 YYYY-MM；date 输出 YYYY-MM-DD；datetime-local 输出 YYYY-MM-DDTHH:mm。6. 仅当页面字段与唯一的简历事实明确对应时标 high；任何存在多种合理归属的情况都不输出。',
      '严格返回 JSON：{"suggestions":[{"idx":字段序号,"value":"","confidence":"high|low","reason":"事实依据"}]}。', '',
      '【结构化简历事实】', JSON.stringify(compactResumeValues(resume)),
    ].join('\n');
    try {
      const raw = await window.LLMBridge.chat(prompt, { response_format: 'json' });
      let data; try { data = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) : raw; } catch (_) { data = null; }
      const suggestions = [];
      (Array.isArray(data?.suggestions) ? data.suggestions : []).forEach(suggestion => {
        const target = targets[Number(suggestion?.idx)];
        if (!target) return;
        const field = fields.find(item => item.key === target.key);
        const value = trimValue(suggestion?.value);
        const normalized = ['month', 'date', 'datetime-local'].includes(field?.inputType) ? normalizeDateValue(value, field.inputType) : value;
        if (!field || !normalized || !isValidFieldValue(field, normalized)) return;
        if (field.inputType === 'select' && !resolveSelectOption(field.element, normalized)) return;
        suggestions.push({ key: field.key, value: String(normalized).slice(0, 3000), confidence: suggestion?.confidence === 'high' ? 'high' : 'low', reason: cleanText(suggestion?.reason) || 'AI 基于简历事实的建议' });
      });
      return suggestions;
    } catch (error) {
      // console.warn('[简历填写助手] 页面级 AI 建议生成失败：', error);
      return [];
    }
  }
  async function getPageFillPlan(resume, allowPageCache, expansionNotes = []) {
    const fields = scanFields();
    const cachedSuggestions = allowPageCache ? getCachedPageSuggestions(fields) : null;
    if (cachedSuggestions) return { ...buildSafeFillPlan(resume, fields, cachedSuggestions), pagePlanSource: 'cache', expansionNotes };
    const localPlan = buildSafeFillPlan(resume, fields);
    if (!allowPageCache || !isAIAvailable()) return { ...localPlan, pagePlanSource: 'local', expansionNotes };
    const suggestions = await generatePageSuggestions(fields, resume, localPlan);
    // 缓存空结果，避免同页反复触发无效请求；该缓存仍严格绑定页面和资料版本。
    cachePageSuggestions(fields, suggestions);
    return { ...buildSafeFillPlan(resume, fields, suggestions), pagePlanSource: suggestions.length ? 'ai' : 'local', expansionNotes };
  }
  function executeSafeFill(items) {
    let filled = 0;
    const failed = [];
    items.forEach(({ field, value }) => {
      if (!field.element?.isConnected || !setNativeValue(field.element, value)) failed.push(field.label || field.key);
      else filled++;
    });
    const message = failed.length ? `已填入 ${filled} 项，${failed.length} 项未填入` : `已填入 ${filled} 项`;
    toast(message, 5000);
    if (failed.length) { /* console.warn('[简历填写助手] 未填入字段：', failed.join('、')); */ }
  }
  function renderSafeFillPreview(plan) {
    const { fields, items, pagePlanSource, expansionNotes = [] } = plan;
    if (!items.length) { setFabVisible(true); toast(`已扫描 ${fields.length} 个字段，当前没有可安全填入的候选项`); return; }
    ensureUI(); remove('.panel'); setFabVisible(false);
    const rows = items.map((item, index) => {
      const current = item.occupied ? `<div class="hint">当前内容：${escapeHtml(item.field.currentValue)}</div>` : '';
      const source = item.source === 'ai'
        ? `<em class="badge ai">AI 建议 · ${escapeHtml(item.confidence === 'high' ? '高置信度' : '低置信度')}</em>`
        : `<em class="badge rule">${item.confidence === 'high' ? '本地匹配' : '本地匹配 · 需确认'}</em>`;
      const reason = item.reason ? `<div class="hint">依据：${escapeHtml(item.reason)}</div>` : '';
      return `<label class="plan-item"><input type="checkbox" data-fill-index="${index}" ${(item.occupied || !item.defaultSelected) ? '' : 'checked'} /><span><b>${escapeHtml(item.field.label || item.field.key)}${source}${item.occupied ? ' <em class="badge">已有内容</em>' : ''}</b><span>${escapeHtml(item.value)}</span>${reason}${current}</span></label>`;
    }).join('');
    const planHint = pagePlanSource === 'cache' ? '已复用当前页面的已校验建议；需确认项默认不选。' : pagePlanSource === 'ai' ? '已补充当前页面的 AI 建议；AI 与低置信度项默认不选。' : '仅展示本地匹配；需确认项默认不选。';
    const expansionHtml = expansionNotes.length ? `<div class="status">${expansionNotes.map(escapeHtml).join('<br>')}</div>` : '';
    const panel = node(`<section class="panel"><button class="close">×</button><h2>一键录入预览</h2><p class="intro">${planHint} 已有内容默认不选；下拉和日期值已按页面控件校验。经历区块仅在可靠识别时自动补齐，绝不自动提交。</p>${expansionHtml}<div class="status">扫描 ${fields.length} 个字段，${items.length} 个可安全填写。请确认后再执行。</div>${rows}<div class="row"><label class="select-all"><input type="checkbox" data-act="select-all" />全选</label><span class="row-spacer"></span><button class="btn ghost" data-act="cancel">取消</button><button class="btn" data-act="fill">填入选中项</button></div></section>`);
    const itemCheckboxes = [...panel.querySelectorAll('input[data-fill-index]')];
    const selectAllCheckbox = panel.querySelector('input[data-act="select-all"]');
    const syncSelectAllState = () => {
      const selectedCount = itemCheckboxes.filter(input => input.checked).length;
      selectAllCheckbox.checked = selectedCount === itemCheckboxes.length;
      selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < itemCheckboxes.length;
    };
    selectAllCheckbox.onchange = () => {
      itemCheckboxes.forEach(input => { input.checked = selectAllCheckbox.checked; });
      syncSelectAllState();
    };
    itemCheckboxes.forEach(input => { input.onchange = syncSelectAllState; });
    syncSelectAllState();
    panel.querySelector('.close').onclick = () => closePanel(panel);
    panel.querySelector('[data-act="cancel"]').onclick = () => closePanel(panel);
    panel.querySelector('[data-act="fill"]').onclick = () => {
      const selected = itemCheckboxes.filter(input => input.checked).map(input => items[Number(input.dataset.fillIndex)]).filter(Boolean);
      if (!selected.length) { toast('请至少选择一项'); return; }
      closePanel(panel);
      executeSafeFill(selected);
    };
    layer.appendChild(panel);
  }
  async function generateResumeFromSavedProfile(onStatus) {
    const seq = ++analysisSeq;
    try {
      const resume = await parseResume(onStatus);
      if (seq !== analysisSeq) return false;
      setResume(resume);
      setPlanState('valid', '简历副本已生成');
      return true;
    } catch (error) {
      if (seq !== analysisSeq) return false;
      const previous = getResumeState();
      setPlanState(previous.resume ? 'stale' : 'missing', previous.resume ? '新简历副本生成失败，继续使用上一版副本' : '简历副本生成失败');
      throw error;
    }
  }
  async function autoFill(opts = {}) {
    const state = getResumeState();
    if (!state.resume) { setFabVisible(true); toast('请先在「简历资料」中保存资料并生成简历副本'); return; }
    const seq = ++pagePlanSeq;
    const usePageCache = state.freshness === 'current';
    let expansionNotes = [];
    if (!usePageCache) {
      toast('新副本正在更新，本次仅使用上一版副本的本地匹配，不读取或写入页面建议缓存');
    } else if (!opts.skipExpansion) {
      const gaps = discoverExperienceGaps(state.resume);
      if (gaps.some(gap => gap.missing > 0)) {
        toast('正在检查并补齐可可靠识别的经历区块…', 20000);
        const expansionResults = await autoExpandExperienceGaps(state.resume);
        expansionNotes = summarizeExperienceExpansion(expansionResults);
      }
    }
    if (seq !== pagePlanSeq) return;
    // console.log('[简历填写助手] 一键录入预览，使用' + (state.source === 'demo' ? '内置演示' : (state.freshness === 'stale' ? '上一版' : '当前')) + '简历副本');
    if (usePageCache && !getCachedPageSuggestions(scanFields()) && isAIAvailable()) toast('正在为当前页面生成补充建议…', 20000);
    const plan = await getPageFillPlan(state.resume, usePageCache, expansionNotes);
    if (seq !== pagePlanSeq) return;
    renderSafeFillPreview(plan);
  }

function importPrompt() { return '你是简历资料整理助手。请仅基于用户提供的简历内容提取和重组信息，不得补充、猜测或编造任何事实。将结果整理为可直接保存到“简历资料库”的中文纯文本，尽量包含：姓名、联系方式、教育经历、实习/工作经历、项目经历、技能、奖项/证书、求职意向。未出现的信息不要虚构。保留时间、公司、学校、项目、职责、技术和量化成果等原始事实；可优化表达但不得改变事实。不要使用 Markdown 表格，不要解释处理过程，只输出整理后的资料文本。'; }
  async function importResumeFile(file, textarea, statusEl, button) {
    if (!file) { statusEl.textContent = '请先选择图片或文本简历。'; return; }
    if (!isAIAvailable()) { statusEl.textContent = '未检测到 Tabbit AI，无法解析文件。'; return; }
    const image = file.type.startsWith('image/') && /\.(png|jpe?g|webp)$/i.test(file.name); const text = /^(text\/|application\/(json|xml))/.test(file.type) || /\.(txt|md|csv|html?)$/i.test(file.name);
    if (!image && !text) { statusEl.textContent = '仅支持 PNG、JPG、JPEG、WEBP 图片及 TXT、MD、CSV、HTML 文本；暂不支持 PDF / DOCX。'; return; }
    if (image && file.size > CONFIG.MAX_IMPORT_IMAGE_BYTES) { statusEl.textContent = '图片超过 2 MB，请压缩后再上传。'; return; }
    if (text && file.size > CONFIG.MAX_IMPORT_TEXT_BYTES) { statusEl.textContent = '文本超过 300 KB，请仅保留简历正文。'; return; }
    button.disabled = true; statusEl.textContent = '正在交给 Tabbit AI 提取并整理简历资料，请稍候…';
    try {
      const reply = image ? await window.LLMBridge.chat(importPrompt(), { images: [await toDataUrl(file)] }) : await window.LLMBridge.chat(`${importPrompt()}\n\n【用户上传的简历文本】\n${await readTextFile(file)}`);
      const parsed = cleanText(reply); if (!parsed) throw new Error('AI 未返回可用资料');
      textarea.value = `${textarea.value.trim()}${textarea.value.trim() ? '\n\n' : ''}【AI 从文件解析 · ${file.name}】\n${parsed}`.slice(0, CONFIG.MAX_PROFILE);
      statusEl.textContent = '解析完成，已追加到下方资料。请核对或编辑后点击“保存资料”，再生成简历副本。';
      toast('简历资料已追加，等待保存');
    } catch (error) { statusEl.textContent = `解析失败：${error?.message || error}。请尝试更小、更清晰的图片或纯文本简历。`; } finally { button.disabled = false; }
  }
  function renderProfilePanel() {
    const demoMode = !hasStoredProfile();
    const profileStatus = demoMode
      ? '首次使用已预置演示资料和副本，可直接体验；编辑后点击“保存资料”会写入当前网站本机。'
      : '可直接编辑下方资料；导入或导出的资料包仅保存在本机，请妥善保管。';
    ensureUI(); remove('.panel'); setFabVisible(false); const panel = node(`<section class="panel profile-panel"><button class="close">×</button><div class="profile-panel-header"><h2 class="profile-title"><span class="profile-title-icon" aria-hidden="true">✦</span><span class="profile-title-text">我的简历资料</span></h2><p class="intro">资料仅保存在当前网站的本机浏览器中。点击“保存资料”后会自动生成简历副本，随后可直接一键录入或双击字段填写。</p><div class="status">${profileStatus}</div></div><textarea class="profile" maxlength="${CONFIG.MAX_PROFILE}" placeholder="姓名：张三\n手机号：138xxxx\n教育经历：...\n实习经历：...\n项目经历：...\n技能：...">${escapeHtml(getProfile())}</textarea><input class="profile-package-file" type="file" accept="application/json,.json" hidden /><div class="profile-panel-footer"><p class="privacy">简历资料仅保存在当前网站的本机浏览器中。脚本不会自动提交表单。</p><div class="row profile-actions"><button class="btn ghost" data-do="import-package">导入资料包</button><button class="btn ghost" data-do="export-package">导出资料包</button><button class="btn ghost" data-do="clear">清空资料</button><button class="btn" data-do="save">保存资料并生成副本</button></div></div></section>`);
    const textarea = panel.querySelector('textarea'); const packageInput = panel.querySelector('.profile-package-file'); const packageImportButton = panel.querySelector('[data-do="import-package"]'); const packageExportButton = panel.querySelector('[data-do="export-package"]'); const status = panel.querySelector('.status');
    panel.querySelector('.close').onclick = () => closePanel(panel);
    packageExportButton.onclick = () => { try { downloadProfilePackage(); toast('简历资料包已导出'); } catch (error) { toast('导出失败：' + (error?.message || error)); } };
    packageImportButton.onclick = () => packageInput.click();
    packageInput.onchange = async () => {
      const file = packageInput.files?.[0];
      if (!file) return;
      if (hasStoredProfile() && !confirm('导入会替换当前网站保存的简历资料和副本，是否继续？')) { packageInput.value = ''; return; }
      packageImportButton.disabled = true; packageExportButton.disabled = true; status.className = 'status loading'; status.textContent = '正在校验并导入简历资料包…';
      try {
        const pkg = await importProfilePackage(file);
        const result = applyImportedProfilePackage(pkg);
        textarea.value = getProfile();
        status.className = result.resumeReady ? 'status ok' : 'status error';
        status.textContent = pkg.resumeValid ? '资料包已导入，原始资料和简历副本均可立即使用。' : (result.resumeReady ? '资料包副本不可信，但原始资料未变，已保留当前有效副本。' : `已导入原始简历资料，但${pkg.reason}，请点击“保存资料并生成副本”重新解析。`);
        toast(result.resumeReady ? '资料包已导入，可立即使用' : '已导入原始资料，请重新生成副本');
      } catch (error) { status.className = 'status error'; status.textContent = '导入失败：' + (error?.message || error); }
      finally { packageInput.value = ''; packageImportButton.disabled = false; packageExportButton.disabled = false; }
    };
    panel.onclick = async event => {
      const action = event.target.dataset.do;
      if (action === 'save') {
        const saveButton = event.target;
        if (!textarea.value.trim()) { status.textContent = '请先录入或追加简历资料。'; return; }
        const profileChanged = setProfile(textarea.value);
        // 副本版本与资料版本一致时无需重新调用 AI；导入完整资料包后也可直接复用。
        if (!profileChanged && getCurrentResume()) {
          status.className = 'status ok';
          status.textContent = '资料未变更，当前简历副本已是最新版本，可直接使用。';
          toast('资料未变更，已使用现有简历副本');
          return;
        }
        invalidateCurrentPlan(profileChanged ? '个人简历资料已更新，正在生成简历副本' : '当前没有有效简历副本，正在生成');
        saveButton.disabled = true;
        packageImportButton.disabled = true;
        packageExportButton.disabled = true;
        panel.querySelector('[data-do="clear"]').disabled = true;
        status.className = 'status loading';
        status.textContent = profileChanged ? '资料已保存，正在生成简历副本，请稍候…' : '正在生成简历副本，请稍候…';
        try {
          const generated = await generateResumeFromSavedProfile(message => { status.textContent = message; });
          if (!generated) return;
          status.className = 'status ok';
          status.textContent = '简历副本已生成，可关闭面板后使用“一键录入”或双击字段填写。';
          toast(profileChanged ? '简历资料已保存，简历副本已生成' : '简历副本已生成');
        } catch (error) {
          status.className = 'status error';
          status.textContent = `资料已保存，但简历副本生成失败：${error?.message || error}。请修改资料后再次点击“保存资料并生成副本”重试。`;
          toast('简历副本生成失败：' + (error?.message || error), 5000);
        } finally {
          saveButton.disabled = false;
          packageImportButton.disabled = false;
          packageExportButton.disabled = false;
          panel.querySelector('[data-do="clear"]').disabled = false;
        }
      } else if (action === 'clear' && confirm('确定清空当前网站保存的简历资料吗？')) {
        analysisSeq++;
        setProfile('');
        clearResume();
        textarea.value = '';
        invalidateCurrentPlan('个人简历资料已清空');
        status.className = 'status';
        status.textContent = '资料已清空，简历副本已失效。';
        toast('已清空资料');
      }
    };
    layer.appendChild(panel);
  }

  // 经历类字段从经历池取全部段（动态新增字段也能用，不依赖 field.key）；非经历字段从 fieldCandidates 取
  
// section 关键词 → 模块（含同义词扩充，未命中 fallback 全模块搜）
  const SECTION_ROUTES = [
    { kw: /工作|工作经历|工作单位|职业|从业|就职|履历/, mods: ['workExperience'] },
    { kw: /实习|实习经历/, mods: ['internship'] },
    { kw: /教育|学校|学历|学业|教育背景|就读|求学/, mods: ['education'] },
    { kw: /项目|项目经历|项目经验|工程经历/, mods: ['projectExperience'] },
    { kw: /校园经历|学生工作|社团经历|学生组织|学生会|班委|实验室/, mods: ['campusExperience'] },
    { kw: /竞赛经历|比赛经历|学科竞赛|竞赛获奖|比赛获奖/, mods: ['competitions'] },
    { kw: /志愿经历|志愿服务|公益经历|社会实践/, mods: ['volunteerExperience'] },
    { kw: /培训经历|职业培训|培训课程/, mods: ['trainingExperience'] },
    { kw: /获奖|奖项|荣誉|奖状|奖励|表彰/, mods: ['awards'] },
    { kw: /证书|资格|认证|资质/, mods: ['certifications'] },
    { kw: /技能|专业技能|技术|能力/, mods: ['skills'] },
    { kw: /自我|简介|评价|个人优势|个人总结/, mods: ['selfEvaluation'] },
    { kw: /论文|发表|出版|文章/, mods: ['publications'] },
    { kw: /专利|发明/, mods: ['patents'] },
    { kw: /语言|外语|语种/, mods: ['languages'] },
    { kw: /作品|开源|个人项目/, mods: ['portfolio'] },
    { kw: /社交|链接|主页/, mods: ['socialLinks'] },
    { kw: /推荐|证明人|介绍人/, mods: ['references'] },
    { kw: /基本|个人|联系|求职|意向/, mods: ['personal', 'jobIntention'] },
  ];
  // 一个页面区块可能明确写成“工作/实习经历”，需要同时覆盖两个模块，不能按路由顺序只取第一个。
  function getSectionRouteModules(section) {
    return [...new Set(SECTION_ROUTES.filter(route => route.kw.test(section || '')).flatMap(route => route.mods))];
  }
  // 同义词组（命中加权）
  const SYNONYMS = [
    /公司|企业|单位|组织|雇主/,
    /学校|院校|高校|university|college/,
    /岗位|职位|职务|职称|角色|role|position/,
    /专业|学科|major/,
    /开始|入职|入学|起始|from|start/,
    /结束|离职|毕业|终止|to|end/,
  ];
  // 本地填充以准确性优先；低于此分数的弱模糊命中交由用户主动触发 AI 生成，不能直接作为候选。
  const LOCAL_MATCH_MIN_SCORE = 0.5;
  // 归一化编辑距离相似度 [0,1]
  function similarity(a, b) {
    a = cleanText(a).toLowerCase(); b = cleanText(b).toLowerCase();
    if (!a || !b) return 0;
    if (a.includes(b) || b.includes(a)) return 1;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    return 1 - dp[m][n] / Math.max(m, n);
  }
  // 招聘站点会把字段语义包在必填标识、填写指令和辅助说明中；这些是展示文案而非字段含义。
  // 只清理确定无业务含义的片段，保留“英文姓名”“户口所在地”等真实语义，提升跨站标签兼容性。
  function normalizeFieldSemantic(value) {
    let text = cleanText(value);
    text = text.replace(/^(?:[*＊]\s*)+|(?:\s*[*＊])+$/gu, '');
    text = text.replace(/[（(]\s*(?:必填|选填|非必填|required|optional)\s*[）)]/giu, ' ');
    text = text.replace(/^(?:请(?:您)?(?:输入|填写|填入|选择|录入)?|请输入|请填写|请填入|请选择|请录入|点击选择|点击填写)\s*/u, '');
    text = text.replace(/[：:]\s*(?:请(?:您)?(?:输入|填写|填入|选择|录入)?|请输入|请填写|请填入|请选择|请录入|点击选择|点击填写|如|例如|示例|必填|选填|非必填).*$/u, '');
    text = text.replace(/\s*(?:为必填项?|不能为空|请填写|请录入)\s*$/u, '');
    return cleanText(text).replace(/[：:]$/u, '').trim();
  }
  // 评分：field 的 aliases 与字段 phrases（label/placeholder/aria/name/id）匹配
  function scoreField(aliases, phrases) {
    let best = 0;
    for (const a of aliases) {
      if (!a) continue;
      for (const p of phrases) {
        if (!p) continue;
        const al = normalizeFieldSemantic(a).toLowerCase(), pl = normalizeFieldSemantic(p).toLowerCase();
        if (!al || !pl) continue;
        // 精确字段名优先；仅包含关系（如“英文姓名”包含“姓名”）只能作为次级命中，
        // 避免短别名抢占语义更明确的字段。
        if (al === pl) { best = Math.max(best, 1.0); continue; }
        if (al.includes(pl) || pl.includes(al)) { best = Math.max(best, 0.86); continue; }
        let syn = false;
        for (const re of SYNONYMS) { if (re.test(a) && re.test(p)) { syn = true; break; } }
        const s = similarity(al, pl) * (syn ? 0.8 : 0.6);
        best = Math.max(best, s);
      }
    }
    return best;
  }
  // 仅采信控件本身、标准绑定关系或同一字段容器内可见标题给出的语义；
  // 不把 getLabel 的推断结果直接作为首要依据，避免错误的跨容器标签污染本地填充。
  function getReliableFieldPhrases(element, fieldLabel) {
    const phrases = [];
    const add = (value) => {
      const text = getUsableFieldLabel(value);
      if (text && !phrases.includes(text)) phrases.push(text);
    };
    const id = element.id ? CSS.escape(element.id) : '';
    const explicit = id && document.querySelector(`label[for="${id}"]`);
    add(explicit?.innerText);
    add(element.closest('label')?.innerText);
    add(getAriaLabelledByText(element));
    add(getTableCellLabel(element));
    add(getPlainTextFieldLabel(element));
    add(element.getAttribute('aria-label'));
    add(element.getAttribute('data-field'));
    add(element.placeholder);
    add(element.name);
    add(element.id);
    add(element.autocomplete);
    // 不回退到扫描阶段的展示标签：它可能来自跨容器推断，缺少可靠语义时宁可不出本地候选并交给 AI。
    return phrases;
  }
  // 站点的字段标题与简历模板命名不完全一致时，按已识别的控件类型补齐确定的同义标题。
  // 这是当前控件自身的语义扩展，不依赖邻居节点，不会重新引入表格串字段。
  function getFieldTypePhrases(fieldType) {
    const aliases = {
      company_name: ['公司', '公司名称', '公司全称', '单位', '单位名称', '工作单位', '实习单位', '任职公司', '就职公司', '雇主', '企业名称'],
    };
    return aliases[fieldType] || [];
  }
  // 再做一层值形态校验：若本地标签提取被站点 DOM 干扰，也不允许把明显的日期填进非日期字段。
  function isCandidateCompatibleWithFieldSemantic(field, value, phrases) {
    const text = trimValue(value);
    if (!text) return false;
    const semantic = [splitFieldContext(field.label).label, ...(phrases || [])].map(normalizeFieldSemantic).join(' ').toLowerCase();
    const looksDate = /^\d{4}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/.test(text) || /^\d{4}[-/.](?:0?[1-9]|1[0-2])$/.test(text);
    const isDateField = /出生|生日|日期|时间|年月|date|dob|start|end|毕业|入职|离职|入学|结业|任职|起止|期间/.test(semantic);
    return !looksDate || isDateField;
  }
  // value → 候选（数组拼接，null 空）；置信度由字段语义命中强度决定。
  function toCandidate(value, label, idx, confidence = 'high') {
    let v = '';
    if (Array.isArray(value)) v = value.filter(Boolean).join('；');
    else if (value != null) v = String(value);
    if (!v) return null;
    return { value: v, reason: idx >= 0 ? (label + ' 第' + (idx + 1) + '段') : label, confidence };
  }
  // 双击选值时非空字段一律追加：textarea 换行分隔，单行用「；」；空字段直接填入
  function appendToElement(element, value) {
    const current = String(element.value || '');
    if (!current.trim()) return value;
    const separator = element.tagName.toLowerCase() === 'textarea' ? '\n' : '；';
    return current + separator + value;
  }
  // 仅按完整值或追加分段判断已使用，不能用 includes：例如工作年限“3”会误命中手机号“138…”。
  function containsCandidateValue(fieldValue, candidateValue) {
    const candidate = cleanText(candidateValue);
    if (!candidate) return false;
    const value = String(fieldValue || '');
    if (cleanText(value) === candidate) return true;
    return value.split(/[\n；]/).some(part => cleanText(part) === candidate);
  }
  // 仅使用页面明确声明的字符限制，不推测视觉计数器或站点私有字节计算规则。
  function getFieldMaxLength(element) {
    const values = [element.maxLength, element.getAttribute('maxlength'), element.getAttribute('data-max-length'), element.getAttribute('data-maxlength'), element.getAttribute('data-limit')];
    for (const value of values) {
      const limit = Number(value);
      if (Number.isInteger(limit) && limit > 0) return limit;
    }
    return 0;
  }
  function candidateFinalValue(element, candidateValue) {
    const existing = String(element.value || '').trim();
    return existing ? appendToElement(element, candidateValue) : candidateValue;
  }
  function getCandidateLengthStatus(element, candidateValue) {
    const maxLength = getFieldMaxLength(element);
    const finalValue = candidateFinalValue(element, candidateValue);
    return { maxLength, finalValue, length: finalValue.length, exceeds: maxLength > 0 && finalValue.length > maxLength };
  }
  function getCandidateDisplayLengthStatus(element, candidate) {
    if (!candidate?.finalValue) return getCandidateLengthStatus(element, candidate?.value);
    const maxLength = getFieldMaxLength(element);
    return { maxLength, finalValue: candidate.finalValue, length: candidate.finalValue.length, exceeds: maxLength > 0 && candidate.finalValue.length > maxLength };
  }
  // 本地匹配只用控件自身的可靠字段语义，避免把同一信息区/表格邻近字段的标题和值串到当前控件。
  function matchField(field, resume, allFields) {
    const { section, label: fieldLabel } = splitFieldContext(field.label);
    const reliablePhrases = [...new Set([...getReliableFieldPhrases(field.element, fieldLabel), ...getFieldTypePhrases(field.fieldType)])];
    if (!reliablePhrases.length || !resume) return [];
    let mods = getSectionRouteModules(section);
    if (!mods.length) mods = Object.keys(resume);
    const hits = [];
    for (const mod of mods) {
      const m = resume[mod];
      if (!m) continue;
      const collect = (fv, fieldKey, isRepeatable, idx) => {
        if (!fv || fv.sensitive || !fv.aliases || !toCandidate(fv.value, '', -1)) return;
        const score = scoreField(fv.aliases, reliablePhrases);
        // 精确别名、包含关系和常见站点差异仍可命中；弱模糊相似不产生本地候选，避免跨字段误填。
        if (score >= LOCAL_MATCH_MIN_SCORE) hits.push({ module: mod, fieldKey, score, isRepeatable, idx, value: fv.value, label: m.label });
      };
      if (m.isRepeatable && Array.isArray(m.items)) m.items.forEach((item, idx) => Object.entries(item).forEach(([fk, fv]) => collect(fv, fk, true, idx)));
      else if (m.fields) Object.entries(m.fields).forEach(([fk, fv]) => collect(fv, fk, false, -1));
    }
    if (!hits.length) return [];
    hits.sort((a, b) => b.score - a.score);
    // 同一语义在多段经历里可能重复；保留分段值，但只取当前控件得分最高的字段语义。
    const best = hits[0];
    const confidence = best.score >= 0.86 ? 'high' : 'low';
    const cands = [];
    if (best.isRepeatable) {
      const m = resume[best.module];
      m.items.forEach((item, idx) => {
        const val = item[best.fieldKey] && item[best.fieldKey].value;
        const c = toCandidate(val, m.label, idx, confidence);
        if (c && isCandidateCompatibleWithFieldSemantic(field, c.value, reliablePhrases)) cands.push(c);
      });
    } else {
      const c = toCandidate(best.value, resume[best.module] && resume[best.module].label || '', -1, confidence);
      if (c && isCandidateCompatibleWithFieldSemantic(field, c.value, reliablePhrases)) cands.push(c);
    }
    if (!cands.length) return [];
    const usedLabelFor = (val) => { const m = allFields.find(f => f !== field && containsCandidateValue(f.element && f.element.value, val)); return m ? m.label : null; };
    const seen = new Set(); const out = [];
    for (const c of cands) {
      if (!c.value || seen.has(c.value)) continue;
      seen.add(c.value);
      out.push({ value: c.value, reason: c.reason, confidence: c.confidence, usedIn: usedLabelFor(c.value) });
    }
    out.sort((a, b) => (a.usedIn ? 1 : 0) - (b.usedIn ? 1 : 0));
    return out;
  }

  function splitFieldContext(label) {
    const parts = String(label || '').split('>').map(item => item.trim()).filter(Boolean);
    return parts.length > 1 ? { section: parts[0], label: parts[parts.length - 1] } : { section: '', label: parts[0] || '' };
  }
  function isNarrativeGenerationField(field, formContext) {
    const semantic = [field.label, formContext.label, formContext.directHints?.join(' '), formContext.contextualHints?.join(' '), formContext.placeholder, formContext.name, formContext.id].filter(Boolean).join(' ');
    return /自我评价|自我介绍|个人(?:简介|总结|优势|概述|描述|陈述)|职业(?:概述|摘要|规划|目标)|核心(?:优势|能力)|能力总结|专业总结|求职动机|应聘理由|岗位匹配|自荐|个人亮点|个人特长/u.test(semantic);
  }
  async function aiGenerateForField(field, resume, fields = scanFields()) {
    if (!isAIAvailable()) throw new Error('未检测到 Tabbit AI，无法生成内容');
    const { section, label } = splitFieldContext(field.label);
    const formContext = getFieldAIContext(field, fields);
    const narrativeMode = isNarrativeGenerationField(field, formContext);
    const mods = getSectionRouteModules(section);
    // 叙述型字段（例如自我评价）通常没有简历中的同名原文，必须综合经历、项目和技能等事实生成。
    // 结构化字段仍优先携带所在区块，避免跨经历误填；没有区块路由时才传入完整事实。
    const resumeContext = narrativeMode
      ? resume
      : (mods.length ? mods.reduce((output, mod) => { if (resume[mod]) output[mod] = resume[mod]; return output; }, {}) : resume);
    const prompt = [
      '你是招聘表单填写助手。请根据“当前页面字段上下文”和“简历事实”生成候选值。',
      '字段上下文中的 directHints、placeholder、同组字段及已填非敏感值，均用于消除字段歧义；同组已填学校、公司、项目名等是定位简历某一段经历的重要锚点。',
      narrativeMode
        ? '当前是叙述型字段。只要简历中存在相关经历、项目、技能、成果或教育事实，就必须将这些明确事实筛选、归纳和重组为符合字段要求的简洁表述；不要求简历中已有同名字段。允许改写和综合多个事实，但不得新增未出现的公司、岗位、年份、技能、职责、成果、数字或主观结论；只有所有简历事实均无法支撑当前字段时才返回空数组。'
        : '当前是结构化事实字段。只能使用简历中直接、明确且同语义的事实；字段无可靠依据时返回空数组，不得猜测或跨字段推断。',
      '通用规则：1. 禁止把岗位填入城市、把其他经历的时间填入当前经历。不得根据公司名称推断行业/单位性质、根据职位推断职级、根据学校推断所在地、根据毕业时间推断预计毕业时间、根据姓名推断英文名；籍贯与户口所在地、期望行业与工作所属行业、职位与职级、工作/实习/校园/竞赛/志愿/培训经历不得互相迁移。2. 控件为 select 时 value 必须精确等于 options 中一项；日期须符合 inputType 要求。3. 当前页面字段上下文中的 maxLength 或 suggestedMaxLength 是长度上限，必须让每个候选 value 不超过该数值；优先保留可核验的量化成果和关键能力。4. 事实唯一且与字段语义明确对应时标 high；有多个同样合理的事实且页面上下文无法定位时，返回最多 3 个 low 候选，并在 reason 说明所依据的简历模块/经历。',
      '严格返回 JSON：{"candidates":[{"value":"","reason":"事实来源及匹配依据","confidence":"high|low"}]}，不要输出其他内容。',
      '【当前页面字段上下文】', JSON.stringify(formContext),
      '【可用简历事实】', JSON.stringify(compactResumeValues(resumeContext)),
    ].join('\n');
    const raw = await window.LLMBridge.chat(prompt, { response_format: 'json' });
    let data; try { data = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) : raw; } catch (_) { data = null; }
    const seen = new Set();
    return (Array.isArray(data?.candidates) ? data.candidates : []).map(candidate => {
      const rawValue = trimValue(candidate?.value);
      const value = ['month', 'date', 'datetime-local'].includes(field.inputType) ? normalizeDateValue(rawValue, field.inputType) : rawValue;
      return { value, reason: cleanText(candidate?.reason) || 'AI 候选', confidence: candidate?.confidence === 'high' ? 'high' : 'low' };
    }).filter(candidate => {
      if (!candidate.value || seen.has(candidate.value) || !isValidFieldValue(field, candidate.value)) return false;
      if (field.inputType === 'select' && !resolveSelectOption(field.element, candidate.value)) return false;
      seen.add(candidate.value);
      return true;
    }).slice(0, 3);
  }
  function compressionPrompt(field, sourceValue, maxLength) {
    const { section, label } = splitFieldContext(field.label);
    return [
      '你是招聘表单文本压缩助手。请在不编造、不补充事实的前提下精简下方待填文本，必须尽量保留原有数字、时间、专有名词、技术名称、职责和量化成果；只返回精简结果，不要解释、不要 Markdown。',
      '【字段】' + label,
      '【所在区块】' + section,
      maxLength > 0 ? '【最大字符数】' + maxLength : '【压缩目标】适度精简，在保留关键事实的前提下显著减少冗余表达',
      '【待填文本】',
      sourceValue,
    ].join('\n');
  }
  async function aiCompressCandidate(field, sourceValue, maxLength) {
    if (!isAIAvailable()) throw new Error('未检测到 Tabbit AI，无法压缩内容');
    const raw = await window.LLMBridge.chat(compressionPrompt(field, sourceValue, maxLength));
    const value = trimValue(raw);
    if (!value) throw new Error('AI 未返回可用的压缩内容');
    if (maxLength > 0 && value.length > maxLength) throw new Error('AI 压缩结果仍超过字段长度限制');
    return value;
  }
  function profileUpdatePrompt(field, value, profile) {
    const { section, label } = splitFieldContext(field.label);
    const context = getFieldContextPhrases(field.element).join('；');
    return [
      '你是简历资料归档助手。判断用户刚在招聘表单填写的信息是否需要补充到原始简历资料。只依据输入内容判断，不得编造、推断或改写用户填写的值。',
      '若资料已有等价事实，返回 shouldAdd:false、conflict:false。若发现同一事实字段存在不同值，返回 shouldAdd:false、conflict:true，并在 reason 中说明冲突。',
      '若需要加入，insertText 必须是简洁的中文资料条目，且必须完整保留【当前字段值】原文。anchor.strategy 只能为 after、before、appendSupplement；after/before 时 anchor.text 必须是【原始简历资料】中唯一且连续出现的原文片段，不可虚构。无法找到可靠位置时使用 appendSupplement。',
      '严格只返回 JSON：{"shouldAdd":true,"conflict":false,"reason":"","insertText":"","anchor":{"strategy":"after|before|appendSupplement","text":""}}，不要输出其他内容。',
      '【当前字段】' + label,
      '【所在区块】' + section,
      '【字段邻近上下文】' + context,
      '【当前字段值】' + value,
      '【原始简历资料】',
      profile,
    ].join('\n');
  }
  async function aiPlanProfileUpdate(field, value, profile) {
    const raw = await window.LLMBridge.chat(profileUpdatePrompt(field, value, profile), { response_format: 'json' });
    let data; try { data = typeof raw === 'string' ? JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')) : raw; } catch (_) { data = null; }
    if (!data || typeof data.shouldAdd !== 'boolean') throw new Error('AI 返回的归档方案无效');
    return {
      shouldAdd: data.shouldAdd,
      conflict: data.conflict === true,
      reason: cleanText(data.reason),
      insertText: trimValue(data.insertText),
      anchor: { strategy: data.anchor?.strategy, text: String(data.anchor?.text || '') },
    };
  }
  // AI 的 shouldAdd 仅作建议；写入前必须以本地规则兜底防重。
  function normalizeProfileFact(value) {
    return cleanText(value).replace(/[：:；;，,。.!！?？\-*（）()【】\[\]]/g, '').toLowerCase();
  }
  function hasEquivalentProfileFact(profile, field, insertText, value) {
    const normalizedInsert = normalizeProfileFact(insertText);
    const { label } = splitFieldContext(field.label);
    const normalizedLabel = normalizeProfileFact(label);
    const normalizedValue = normalizeProfileFact(value);
    return String(profile || '').split(/\n+/).some(line => {
      const normalizedLine = normalizeProfileFact(line);
      if (!normalizedLine) return false;
      // 优先按 AI 归档条目完整一致判断，兼容不同的标签提取方式。
      if (normalizedInsert && normalizedLine === normalizedInsert) return true;
      // 再按字段语义和完整值判断，避免仅凭“成都”等常见值造成误拦截。
      return !!(normalizedLabel && normalizedValue && normalizedLine.includes(normalizedLabel) && normalizedLine.includes(normalizedValue));
    });
  }
  function appendProfileSupplement(profile, insertText) {
    const heading = '【表单补充资料】';
    const prefix = profile.trimEnd();
    const headingAt = prefix.lastIndexOf(heading);
    if (headingAt !== -1) return prefix + '\n' + insertText;
    return prefix + (prefix ? '\n\n' : '') + heading + '\n' + insertText;
  }
  function applyProfileUpdate(profile, plan, value) {
    const insertText = plan.insertText;
    // 归档文本必须保留用户实际填写值，防止 AI 擅自改写事实。
    if (!insertText || insertText.length > 1000 || !cleanText(insertText).includes(cleanText(value))) throw new Error('AI 返回的补充内容未保留当前字段值');
    const strategy = plan.anchor.strategy;
    const anchorText = plan.anchor.text;
    if ((strategy === 'after' || strategy === 'before') && anchorText) {
      const first = profile.indexOf(anchorText);
      const last = profile.lastIndexOf(anchorText);
      if (first !== -1 && first === last) {
        const at = strategy === 'after' ? first + anchorText.length : first;
        return { profile: profile.slice(0, at) + '\n' + insertText + '\n' + profile.slice(at), fallback: false };
      }
    }
    return { profile: appendProfileSupplement(profile, insertText), fallback: true };
  }
  async function addCurrentFieldToProfile(field, sourceValue = field.element.value) {
    // 入队时冻结用户当前填写值；任务真正执行时读取最新资料，避免与此前的后台归档相互覆盖。
    const value = trimValue(sourceValue);
    const profile = getProfile();
    if (!value) throw new Error('请先填写当前字段，再加入简历资料');
    if (!profile) throw new Error('尚未保存原始简历资料，请先在“简历资料”中录入资料');
    if (!isAIAvailable()) throw new Error('未检测到 Tabbit AI，无法归类资料');
    const plan = await aiPlanProfileUpdate(field, value, profile);
    if (!plan.shouldAdd) {
      if (plan.conflict) throw new Error((plan.reason || '原始简历资料中存在冲突信息') + '，请到“简历资料”中人工核对');
      return { added: false, reason: plan.reason || '该信息已存在于简历资料中' };
    }
    if (hasEquivalentProfileFact(profile, field, plan.insertText, value)) {
      return { added: false, reason: '该字段值已存在于简历资料中，已跳过重复加入' };
    }
    const updated = applyProfileUpdate(profile, plan, value);
    const profileChanged = setProfile(updated.profile);
    // 正常补充一定会变更资料；异常重复或截断未产生变化时，复用已追平的副本，避免无效解析。
    if (!profileChanged && getCurrentResume()) return { added: false, reason: '资料未发生变化，当前简历副本保持可用' };
    invalidateCurrentPlan(profileChanged ? '简历资料已补充，正在生成简历副本' : '当前没有有效简历副本，正在生成');
    const generated = await generateResumeFromSavedProfile();
    if (!generated) throw new Error('简历副本生成已取消');
    return { added: true, fallback: updated.fallback, profileChanged };
  }
  function enqueueCurrentFieldProfileUpdate(field) {
    const value = trimValue(field.element.value);
    if (!value) throw new Error('请先填写当前字段，再加入简历资料');
    if (!getProfile()) throw new Error('尚未保存原始简历资料，请先在“简历资料”中录入资料');
    if (!isAIAvailable()) throw new Error('未检测到 Tabbit AI，无法归类资料');
    const requestKey = hash(`${field.key}|${normalizeProfileFact(field.label)}|${normalizeProfileFact(value)}`);
    if (pendingProfileUpdateKeys.has(requestKey)) return { queued: false, reason: '该字段正在后台加入简历资料' };
    pendingProfileUpdateKeys.add(requestKey);
    // 任务失败后吞掉队列错误，让后续归档任务仍能继续执行；错误仍通过 task 返回给调用方提示。
    const task = profileUpdateQueue.then(
      () => addCurrentFieldToProfile(field, value),
      () => addCurrentFieldToProfile(field, value),
    );
    profileUpdateQueue = task.catch(() => undefined);
    task.then(
      () => pendingProfileUpdateKeys.delete(requestKey),
      () => pendingProfileUpdateKeys.delete(requestKey),
    );
    return { queued: true, task };
  }
  function notifyBackgroundProfileUpdate(task) {
    task.then(result => {
      if (!result.added) {
        toast(result.reason || '该信息未加入简历资料', 5000);
        return;
      }
      toast(result.fallback ? '已加入简历资料并更新副本（未找到可靠位置，已归入表单补充资料）' : '已加入简历资料并更新副本', 5000);
    }).catch(error => {
      toast('后台加入简历资料失败：' + (error?.message || error), 5000);
    });
  }
  function renderQuickCard(element) {
    ensureUI(); remove('.quick-card');
    const fields = scanFields();
    const field = fields.find(f => f.element === element);
    if (!field) return;
    const resumeState = getResumeState();
    const resume = resumeState.resume;
    if (!resume) { toast('请先在「简历资料」中保存资料并生成简历副本'); return; }
    if (resumeState.freshness === 'stale') toast('新副本正在更新，当前候选来自上一版简历资料');
    let candidates = matchField(field, resume, fields);
    const rect = element.getBoundingClientRect();
    const cardX = Math.max(8, Math.min(rect.left, window.innerWidth - 380));
    const renderItems = (list) => list.map((c, i) => {
      const status = getCandidateDisplayLengthStatus(element, c);
      const lengthHint = status.maxLength ? ' · <span class="' + (status.exceeds ? 'qc-limit' : '') + '">' + status.length + ' / ' + status.maxLength + '</span>' : '';
      const compress = status.exceeds ? '<button class="qc-compress" type="button" data-compress-idx="' + i + '">压缩</button>' : '';
      return '<div class="qc-item' + (c.usedIn ? ' used' : '') + '" data-idx="' + i + '"><div class="qc-value">' + escapeHtml(c.value) + '</div><div class="qc-meta">' + escapeHtml(c.reason || 'AI 建议') + lengthHint + (c.usedIn ? '<span class="qc-used-tag">已用于 ' + escapeHtml(c.usedIn) + '</span>' : '') + compress + '</div></div>';
    }).join('');
    const card = node('<div class="quick-card" style="top:0;left:' + cardX + 'px"><div class="qc-head"><span class="qc-title">' + escapeHtml(field.label || '字段填充建议') + '</span><div class="qc-actions"><button class="qc-refresh" type="button" title="重新匹配" aria-label="重新匹配">↻</button><button class="qc-close" type="button" title="关闭" aria-label="关闭">×</button></div></div><div class="qc-body">' + (candidates.length ? renderItems(candidates) : '<div class="qc-empty">本地未匹配，可点击下方按钮让AI生成</div>') + '</div><div class="qc-footer"><button class="qc-ai-gen" type="button">✨ AI 分析生成</button><button class="qc-compress-current" type="button">压缩内容</button><button class="qc-save-profile" type="button">加入简历资料</button></div></div>');
    layer.appendChild(card);
    const cardH = card.offsetHeight;
    let cardY = rect.bottom + 4;
    if (cardY + cardH > window.innerHeight - 8) cardY = rect.top - cardH - 4;
    cardY = Math.max(8, Math.min(cardY, window.innerHeight - cardH - 8));
    card.style.top = cardY + 'px';
    const fillCandidate = (candidate) => {
      const val = candidate && candidate.value;
      if (!val) return;
      const existing = String(element.value || '').trim();
      if (!candidate.finalValue && existing && containsCandidateValue(element.value, val)) { toast('候选已存在于「' + (field.label || '字段') + '」中，已跳过'); return; }
      const next = candidate.finalValue || (existing ? appendToElement(element, val) : val);
      element.focus(); setNativeValue(element, next);
      card.remove(); toast(candidate.finalValue ? '已填入压缩内容「' + (field.label || '') + '」' : (existing ? '已追加到「' + (field.label || '') + '」' : '已填入「' + (field.label || '') + '」'));
    };
    card.querySelector('.qc-close').onclick = () => card.remove();
    const refreshBtn = card.querySelector('.qc-refresh');
    refreshBtn.onclick = () => {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('loading');
      // 重新扫描页面字段，并读取最新已落库的简历副本，适配用户更新资料后的手动刷新。
      setTimeout(() => {
        if (!card.isConnected) return;
        const latestFields = scanFields();
        const latestField = latestFields.find(item => item.element === element);
        const latestState = getResumeState();
        if (!latestField || !latestState.resume) {
          toast('当前没有可用的简历副本，请先保存资料并生成副本');
        } else {
          candidates = matchField(latestField, latestState.resume, latestFields);
          const body = card.querySelector('.qc-body');
          body.innerHTML = candidates.length ? renderItems(candidates) : '<div class="qc-empty">本地未匹配，可点击下方按钮让AI生成</div>';
          bindCandidateItems();
          toast(latestState.freshness === 'stale' ? '已刷新匹配，当前候选来自上一版简历资料' : '已按最新简历副本刷新匹配');
        }
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
      }, 0);
    };
    const bindCandidateItems = () => {
      card.querySelectorAll('.qc-item').forEach(item => {
        item.onclick = () => { const c = candidates[Number(item.dataset.idx)]; if (c) fillCandidate(c); };
      });
      card.querySelectorAll('.qc-compress').forEach(button => {
        button.onclick = async event => {
          event.stopPropagation();
          const index = Number(button.dataset.compressIdx);
          const candidate = candidates[index];
          if (!candidate) return;
          const status = getCandidateLengthStatus(element, candidate.value);
          if (!status.exceeds) return;
          button.disabled = true; button.textContent = '压缩中…';
          try {
            const compressedValue = await aiCompressCandidate(field, status.finalValue, status.maxLength);
            if (candidates.some(item => cleanText(item.value) === cleanText(compressedValue))) { toast('已存在相同的压缩候选'); return; }
            candidates.splice(index + 1, 0, { value: compressedValue, finalValue: compressedValue, reason: 'AI 压缩', confidence: 'low' });
            const body = card.querySelector('.qc-body');
            body.innerHTML = renderItems(candidates);
            bindCandidateItems();
          } catch (error) { toast('压缩失败：' + (error?.message || error), 5000); }
        };
      });
    };
    bindCandidateItems();
    const aiBtn = card.querySelector('.qc-ai-gen');
    const compressCurrentBtn = card.querySelector('.qc-compress-current');
    const saveProfileBtn = card.querySelector('.qc-save-profile');
    aiBtn.onclick = async () => {
      aiBtn.disabled = true; compressCurrentBtn.disabled = true; saveProfileBtn.disabled = true; aiBtn.textContent = 'AI 生成中…';
      try {
        const gen = await aiGenerateForField(field, resume, fields);
        if (gen.length) {
          candidates = gen;
          const body = card.querySelector('.qc-body');
          body.innerHTML = renderItems(gen);
          bindCandidateItems();
        } else {
          const body = card.querySelector('.qc-body');
          body.innerHTML = '<div class="qc-empty">AI 暂未找到可用于生成的简历参考信息；可补充相关经历后重试</div>';
          toast('AI 未返回可用候选，可检查简历资料后重试');
        }
      } catch (e) { toast('AI 生成失败：' + (e && e.message || e)); }
      finally { aiBtn.disabled = false; compressCurrentBtn.disabled = false; saveProfileBtn.disabled = false; aiBtn.textContent = '✨ AI 分析生成'; }
    };
    compressCurrentBtn.onclick = async () => {
      const rawValue = String(element.value || '');
      const sourceValue = trimValue(rawValue);
      if (!sourceValue) { toast('当前字段暂无内容可压缩'); return; }
      const maxLength = getFieldMaxLength(element);
      aiBtn.disabled = true; compressCurrentBtn.disabled = true; saveProfileBtn.disabled = true; compressCurrentBtn.textContent = '压缩中…';
      try {
        const compressedValue = await aiCompressCandidate(field, sourceValue, maxLength);
        if (String(element.value || '') !== rawValue) { toast('字段内容已变更，未覆盖回填压缩结果'); return; }
        element.focus(); setNativeValue(element, compressedValue);
        card.remove();
        toast(maxLength ? '已压缩并回填「' + (field.label || '') + '」（' + compressedValue.length + '/' + maxLength + '）' : '已适度精简并回填「' + (field.label || '') + '」');
      } catch (error) {
        toast('压缩内容失败：' + (error?.message || error), 5000);
      } finally {
        aiBtn.disabled = false; compressCurrentBtn.disabled = false; saveProfileBtn.disabled = false; compressCurrentBtn.textContent = '压缩内容';
      }
    };
    saveProfileBtn.onclick = () => {
      try {
        const queued = enqueueCurrentFieldProfileUpdate(field);
        if (!queued.queued) {
          toast(queued.reason, 4000);
          closeCard();
          return;
        }
        // 归档与副本重建在后台串行执行；当前卡片立即收起，用户可继续填写其他字段。
        closeCard();
        toast('已开始在后台加入简历资料，可继续填写；完成后将通知你', 5000);
        notifyBackgroundProfileUpdate(queued.task);
      } catch (error) {
        toast('加入简历资料失败：' + (error?.message || error), 5000);
      }
    };
    const closeCard = () => { card.remove(); document.removeEventListener('mousedown', onDown, true); document.removeEventListener('scroll', closeCard, true); };
    const onDown = (e) => { if (!e.composedPath().includes(card) && e.target !== element) closeCard(); };
    setTimeout(() => { document.addEventListener('mousedown', onDown, true); document.addEventListener('scroll', closeCard, true); }, 0);
  }

function watchDblClick() {
    document.addEventListener('dblclick', (e) => {
      const el = e.target;
      if (!isSupportedField(el) || isSensitiveField(el) || isOwnNode(el)) return;
      e.preventDefault();
      renderQuickCard(el);
    }, true);
  }

  function init() {
    ensureUI();
    syncPlanState();
    watchDblClick();
    window.addEventListener('focus', syncPlanState);
    window.addEventListener('resize', () => {
      if (!layer) return;
      const stack = layer.querySelector('.fab-stack');
      if (!stack) return;
      saveFabPosition(getFabPosition());
      applyFabPosition(stack, fabPosition);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { analysisSeq++; closePanel(layer?.querySelector('.panel')); remove('.quick-card'); } }, true);
  }
  init();
})();