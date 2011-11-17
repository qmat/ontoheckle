// Adds an event listener to pull up heckles and objects from the sparql query
// in time with the video playback.
window.addEventListener('load', 
  function() {
    var stage = document.getElementById('stage');
    var log = document.getElementById('logger');
    var seqlog = document.getElementById('loggersequences');
    var v = document.getElementsByTagName('video')[0];
    but = document.createElement('button');
    but.innerHTML = 'click to pause';
    but.addEventListener('click',function(e) {
      v.pause();
      e.preventDefault();
    },false);
    var now = 0;
    v.addEventListener('timeupdate',function(o){
      var full = parseInt(v.currentTime);
      if(full >= now) {
	now = now + 1;
	var triggers=eventSecs();
	for (s in triggers)
	  {
	  if (triggers[s] == now)
	    {
	    handleEventAtSec(now);
	    } 
	    // DEMO code... so you don't have to keep reloading in a demo
	    // situation because we only have 15 minutes of annotations for the
	    // heckle system at this time
	    //	  if (now >= 960)
	    //	  {
	    //    	window.location.reload();
	    //	  	v.currentTime = 0;
	    //		p.clearNodes();
	    //		var canvas = document.getElementsByTagName('pCanvas')[0];
	    //		canvas.redraw();
	    //    }
	  }
      }

    },false);
  }, 
false); 
