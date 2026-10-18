var add_menu = function() {
    if(!document.getElementById("bilibili-player")){return;}

    let rate_menu = document.querySelector(".bpx-player-ctrl-playbackrate-menu");
    if(!rate_menu){return;}
    if(rate_menu.children.length > 6){return;}

    let rates = new Array();
    rates.push(1.8, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 4);
    let additional_length =rates.length;
    for(let i=0; i < additional_length; i++){
        let new_item = document.createElement("li");
        new_item.setAttribute("class", "bpx-player-ctrl-playbackrate-menu-item ");
        rate_menu.insertBefore(new_item, rate_menu.children[0]);
    }
    
    rates.push(0.5, 0.75, 1, 1.25, 1.5, 2);
    rates.sort().reverse();
    
    for(let i=0; i < rate_menu.children.length; i++){
        rate_menu.children[i].setAttribute("data-value", rates[i].toString())
        rate_menu.children[i].innerText = rates[i].toString() + "x"
    }
}

var adjust_toolbar = function(){
  let toolbar = document.getElementsByClassName("video-toolbar-right")[0];
  let items = document.getElementsByClassName("video-tool-more-dropdown")[0].getElementsByClassName("video-toolbar-right-item");
  while(items.length>0){
    toolbar.insertBefore(items[0], toolbar.children[0]);
    items = document.getElementsByClassName("video-tool-more-dropdown")[0].getElementsByClassName("video-toolbar-right-item");
  }
  document.getElementsByClassName("video-tool-more").forEach(function(e){e.hidden=true});
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const updateWatchLaterText = function(){
  sleep(2000).then(() => {
    if(document.querySelector(".video-watchlater .added")){
      document.querySelector(".video-watchlater .video-watchlater-info").innerText = '移除稍后再看';
    }else{
      document.querySelector(".video-watchlater .video-watchlater-info").innerText = '稍后再看';
    }
  });
}

var postpone_exec = function(){
  add_menu();
  adjust_toolbar();

  wl_btns = document.getElementsByClassName("video-watchlater");
  if(wl_btns){
    wl_btns[0].addEventListener("click", updateWatchLaterText);
  }
}

setTimeout(postpone_exec, 3 * 1000);


const setSpeed = function(speedRelativeMove){
  let rate_menu = document.querySelector(".bpx-player-ctrl-playbackrate-menu");
  if(!rate_menu){return;}
  options = rate_menu.children;
  for(var i = 0; i < options.length; i++){
    if(options[i].getAttribute('class').indexOf('active') != -1){
      newSpeedIndex = (i + options.length + speedRelativeMove) % options.length;
      options[newSpeedIndex].click();
      break;
    }
  }
}

const switchSubtitle = ()=> {
    let closeButton = document.getElementsByClassName("bpx-player-ctrl-subtitle-close-switch")[0];
    if(!closeButton){return;}
    let subtitleButtons = Array();
    let st = document.getElementsByClassName("bpx-player-ctrl-subtitle-language-item");
    for(let i=0;i<st.length;i++){subtitleButtons.push(st[i]);}
    subtitleButtons.push(closeButton);
    let activeIndex = 0;
    for(i=0;i<subtitleButtons.length;i++){
      if(subtitleButtons[i].className.indexOf("active")!=-1){
        activeIndex = (i+1) % subtitleButtons.length;
        break;
      }
    }
    subtitleButtons[activeIndex].click();
}

const switchResolution = ()=>{
    let rb = document.getElementsByClassName("bpx-player-ctrl-quality-menu-item");
    let resolutionButtons = Array();
    for(let i=rb.length-1;i>0;i--){
        if(rb[i].innerHTML.indexOf("badge") == -1){
            resolutionButtons.push(rb[i]);
        }
    }
    for(let i=0;i<resolutionButtons.length;i++){
        if(resolutionButtons[i].className.indexOf("active")!=-1){
            resolutionButtons[(i+1)%resolutionButtons.length].click();
        }
    }
}

document.addEventListener("keydown", (event) => {
  if(event.key === '+' || event.key.toLowerCase() === 'c'){
    setSpeed(-1);
  }else if(event.key === '-' || event.key.toLowerCase() === 'x') {
    setSpeed(1);
  }else if(event.key.toLowerCase() === 's'){
    switchSubtitle();
  }else if(event.key.toLowerCase() === 'r'){
    switchResolution();
  }
});