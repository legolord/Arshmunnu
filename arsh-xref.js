/* ════════════════════════════════════════════════════════════
   arsh-xref.js — the Archive's shared cross-reference engine.

   Drop this into ANY chamber:
       <script src="arsh-xref.js"></script>
   …and authored text can link to canon with double brackets:
       [[Aelarion]]            → links to the entity "Aelarion"
       [[Imvien|the Imviens]]  → links to "Imvien", shown as "the Imviens"

   It reads the same registry the Concordance writes (localStorage
   key 'arsh_registry_v1'), so a name typed anywhere resolves to the
   one canonical record. No server required; works from file:// too.
   ════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';
  var STORE='arsh_registry_v1';

  function load(){try{return JSON.parse(localStorage.getItem(STORE))||{entities:{}};}catch(e){return {entities:{}};}}

  // name / alias → entity id  (lowercased)
  function nameIndex(db){
    var idx={};
    for(var id in db.entities){
      var e=db.entities[id];
      idx[(e.name||'').toLowerCase()]=id;
      (e.aliases||[]).forEach(function(a){ if(a) idx[a.toLowerCase()]=id; });
    }
    return idx;
  }
  function resolve(name){
    var db=load(), idx=nameIndex(db), key=String(name||'').trim().toLowerCase();
    return idx[key]||null;
  }

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  // Open an entity in the Concordance — through the Archive hub if we're framed,
  // otherwise by navigating straight to the Concordance with a deep-link hash.
  function openEntity(id){
    var hash='entity='+encodeURIComponent(id);
    try{
      if(global.parent && global.parent!==global && typeof global.parent.openApp==='function'){
        global.parent.openApp('concordance');
        setTimeout(function(){try{
          var f=global.parent.document.getElementById('app-frame');
          if(f) f.contentWindow.location.hash='#'+hash;
        }catch(e){}},560);
        return;
      }
    }catch(e){}
    global.location.href='arshmunnu_concordance.html#'+hash;
  }

  // Turn the [[bracket]] syntax inside an HTML string into anchors.
  // (Operates only on the explicit [[ ]] markup — never guesses, so no false hits.)
  function format(html){
    return String(html).replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,function(_,name,label){
      var id=resolve(name), shown=esc((label||name).trim());
      if(id) return '<a class="xref" data-xref="'+esc(id)+'" href="javascript:void 0">'+shown+'</a>';
      return '<span class="xref xref-missing" title="Not yet in the Concordance">'+shown+'</span>';
    });
  }

  // Walk a live DOM subtree and resolve [[ ]] found in its text nodes.
  function linkify(root){
    root=root||document.body; if(!root) return;
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode:function(n){
        if(!n.nodeValue||n.nodeValue.indexOf('[[')<0) return NodeFilter.FILTER_REJECT;
        var p=n.parentNode;
        if(p&&(p.tagName==='SCRIPT'||p.tagName==='STYLE'||p.tagName==='TEXTAREA'||p.classList&&p.classList.contains('xref'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes=[],n; while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(function(node){
      var span=document.createElement('span');
      span.innerHTML=format(esc(node.nodeValue));
      node.parentNode.replaceChild(span,node);
    });
    bind(root);
  }

  function bind(root){
    (root||document).querySelectorAll('a.xref[data-xref]').forEach(function(a){
      if(a.__xb) return; a.__xb=1;
      a.addEventListener('click',function(e){e.preventDefault();openEntity(a.dataset.xref);});
    });
  }

  // inject a little styling once
  function inject(){
    if(document.getElementById('arsh-xref-css')) return;
    var s=document.createElement('style'); s.id='arsh-xref-css';
    s.textContent='.xref{color:#cf7d63;text-decoration:none;border-bottom:1px dotted rgba(207,125,99,.5);cursor:pointer;transition:color .15s,border-color .15s;}'
      +'.xref:hover{color:#f0cc72;border-bottom-color:#f0cc72;}'
      +'.xref-missing{color:#928c9e;border-bottom:1px dotted rgba(146,140,158,.45);cursor:help;}';
    (document.head||document.documentElement).appendChild(s);
  }
  if(typeof document!=='undefined'){ if(document.readyState!=='loading') inject(); else document.addEventListener('DOMContentLoaded',inject); }

  global.ArshXref={ load:load, resolve:resolve, openEntity:openEntity, format:format, linkify:linkify, bind:bind, nameIndex:nameIndex };
})(typeof window!=='undefined'?window:this);
