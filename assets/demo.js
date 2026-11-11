(function(){
var SKILLS=[{"t": "Brushing my teeth", "say": "Brushing washes away sugar bugs that can hurt your teeth.", "steps": ["Brush in tiny circles.", "Keep going for 2 whole minutes.", "Brush the top, the bottom, the front, and the back!"]}, {"t": "Washing my hands after the bathroom", "say": "Germs are teeny tiny and you can't see them. Soap and water wash them away.", "steps": ["Wet your hands and put on soap.", "Scrub while you sing Happy Birthday two times.", "Rinse and dry."]}, {"t": "Asking for help", "say": "Everybody needs help sometimes. Asking is brave and smart.", "steps": ["Take a deep breath.", "Ask, \"Can you help me with this, please?\""]}];
var MSG={D:'Nice. This one goes on your green list.',H:'Okay. Someone can practice this with you.',P:'Good pick. It goes on your lessons list.'};
var root=document.getElementById('demo');if(!root)return;
var state={};
function render(){
  var h='';
  SKILLS.forEach(function(s,i){
    var k=state[i];
    h+='<div class="demo-skill" data-k="'+(k||'')+'"><div class="demo-head"><h3>'+s.t+'</h3><p>'+s.say+'</p></div><div class="demo-dots" role="group" aria-label="How does '+s.t+' feel for you?">';
    [['D','I know it'],['H','I need help'],['P','I want to learn it']].forEach(function(o){
      h+='<button type="button" class="dot '+o[0]+(k===o[0]?' on':'')+'" data-i="'+i+'" data-k="'+o[0]+'" aria-pressed="'+(k===o[0])+'"><span class="dot-mark" aria-hidden="true"></span>'+o[1]+'</button>';
    });
    h+='</div>';
    if(k){
      h+='<div class="demo-reply" role="status"><p>'+MSG[k]+'</p>';
      if(k!=='D'){h+='<ol>'+s.steps.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ol>';}
      h+='</div>';
    }
    h+='</div>';
  });
  root.innerHTML=h;
}
root.addEventListener('click',function(e){
  var b=e.target.closest('button[data-i]');if(!b)return;
  var i=b.getAttribute('data-i'),k=b.getAttribute('data-k');
  state[i]=state[i]===k?null:k;
  var y=window.scrollY;render();
  var again=root.querySelector('button[data-i="'+i+'"][data-k="'+k+'"]');if(again)again.focus({preventScroll:true});
  window.scrollTo(0,y);
});
render();
})();
