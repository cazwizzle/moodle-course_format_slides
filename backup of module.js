M.format_slides = {
	_currentTopic : Object,
	_currentTopicNum : Number,
	_loadedTopics : Array,
	_courseId : Number,
	_sesskey : String,
	_mode : Number,
	_sliding : false,
	_strings : Object,
	
	loadTopics : function(topic) {
	    var _this = this;
		YUI.use('io', 'node', 'event', function(Y){
			 var visibleTopics = Y.all('#steps li');
			 var loadAll = false;
			 var i=0;
			 if(topic == undefined) {
				 loadAll = true;
			     for(i; i<_this._loadedTopics.length; i++){
			    	 if(!_this._loadedTopics[i]) {
			    		 topic = visibleTopics.item(i+1).getAttribute("rel").replace("section-", "");
			    		 break;
			    	 }
			     }
			 } else {
				 // topic is only passed when a teacher is updating a section, all topics will be visible so topic  == i
				 i = topic;
			 }

			 if(topic == undefined) {
				 Y.one("ul.topics-nav li.prev").addClass("active");
				 Y.one("ul.topics-nav li.next").addClass("active");
				 return;
			 }
			 
			 var container = Y.one("ul.topics");
			 
			function loadComplete(id, o, args) {
				//sectionId, loadIndex
				Y.detach("io:complete", loadComplete);
			    var newSection = Y.Node.create(o.responseText);
			    var sections = container.all("li.section");
			    var lastNode = sections.item(sections.size() -1);

			    if(_this._loadedTopics[args.loadIndex] == true) { // exists so replace it
			    	var oldSection = Y.one(args.sectionId);
			    	oldSection.replace(newSection);
			    } else { // section is new so insert or append it
			    	var isBefore = parseInt(lastNode.get("id").replace("section-", "")) > topic
			    	if(isBefore) {
					   container.insert(newSection, lastNode);
				    } else {
				       container.append(newSection);
				    }
			    	newSection.setAttribute("style", "display:none;");

			    	//	if(!newSection.hasClass("dimmed")){ // only for student
				        var nav = Y.one("ul#steps li[rel=section-"+topic+"]");
					    nav.addClass("active");
				  //  } 
				    
				    _this._loadedTopics[args.loadIndex] = true;
			    }
			    
			    if(_this._mode == 1 ) { // editing is on
				    var btnHighlight = newSection.one(".topiccontrols a.highlight");
				    var btnShow = newSection.one(".topiccontrols a[title=Show topic]") || newSection.one(".topiccontrols a[title=Hide topic]");
				    var btnMoveUp = newSection.one(".topiccontrols a.move.up");
				    var btnMoveDown = newSection.one(".topiccontrols a.move.down");
				    
				    if(btnHighlight) Y.Event.attach('click',_this.highlightTopic, btnHighlight, _this);
				    if(btnShow) Y.Event.attach('click',_this.showhideTopic, btnShow, _this);
				    if(btnMoveUp) Y.Event.attach('click',_this.reorderTopicsByDrag, btnMoveUp, _this);
				    if(btnMoveDown) Y.Event.attach('click',_this.reorderTopicsByDrag, btnMoveDown, _this);
			    }
			    
			   if(loadAll) _this.loadTopics();
			}
			
			var uri = "format/slides/ajax_gettopic.php";
			var cfg = {
				method: "POST",
				data: "topic=" + topic + "&" + "id=" + _this._courseId + "&" + "mode=" + _this._mode,
	            on: {
			        complete:loadComplete
			    },
			    arguments: {
			    	sectionId:"#section-"+topic, 
			    	loadIndex:i
			    }
			}
			//var evt = Y.on('io:complete', loadComplete, Y, "#section-"+topic, i);
			var request = Y.io(uri, cfg);
		});
    },
    
    changeTopic : function(e){
	    var _this = this;
	    e.preventDefault();
	    
		YUI().use('node', 'transition', 'cookie', 'sortable', function(Y){
			if(!e.currentTarget.hasClass("active") || _this._sliding) return false;
			
		    // var dir = e.currentTarget.hasClass("prev") ? -1 : 1;
		    var newVisibleTopic;
		    var sectionNum = -1;
		    
		    _this._currentTopic = Y.all("li.section").item(_this._currentTopicNum);
	    	
		    // back . next
		    if(e.currentTarget.hasClass("prev")) newVisibleTopic = _this._currentTopic.previous(); 
		    if(e.currentTarget.hasClass("next")) newVisibleTopic = _this._currentTopic.next();
		    
		    // numbers
		    if(e.currentTarget.hasClass("jump-to")) {
			    var sectionPos = Y.all(".topics-nav li.jump-to").indexOf(e.currentTarget);
			    newVisibleTopic = Y.all("li.section").item(sectionPos);
		    }
		    
		    // remember the section and do the transition
		    if(newVisibleTopic){
		    	_this._sliding = true;
		    	
		    	var oldNum = _this._currentTopicNum;
		    	_this._currentTopicNum = Y.all("li.section").indexOf(newVisibleTopic);
		    	var dir = oldNum - _this._currentTopicNum;
		    	dir = dir/Math.abs(dir);
		    	
		    	// update setDisplay
		    	YUI.use('io', 'json-parse', function(Y){
					var query = "action=set_display&" +
								"sesskey=" + _this._sesskey + "&" +
						        "courseId=" + _this._courseId + "&" + 
					            "sectionId=" + (_this._currentTopicNum -1);
					
					var uri = "format/slides/ajax_sectionactions.php?" + query;
					function setDisplayComplete(id, o, args) {
					    // var responseData = Y.JSON.parse(o.responseText);
					    Y.detach("io:complete");
					}
					Y.on('io:complete', setDisplayComplete, Y);
					var request = Y.io(uri);
				});
		    	
		    	Y.all(".topics-nav li").removeClass("current");
	    		Y.all("#steps li").item(_this._currentTopicNum).addClass("current");

	    		newVisibleTopic.previous() == null ? Y.one(".topics-nav .prev").removeClass("active") : Y.one(".topics-nav .prev").addClass("active");
	    		newVisibleTopic.next() == null ? Y.one(".topics-nav .next").removeClass("active") : Y.one(".topics-nav .next").addClass("active");
	    		
	    		newVisibleTopic.setStyle("display", "block");
	    		var w = _this._currentTopic.get('offsetWidth');
	    		var h = dir === -1 ? _this._currentTopic.get('offsetHeight') : newVisibleTopic.get("offsetHeight");
	    		
	    		if(dir===-1) newVisibleTopic.setStyle("top", (25+h)*-1);
	    		if(dir===1) _this._currentTopic.setStyle("top", (25+h)*-1);
	    		
	    		_this._currentTopic.transition({
					left: (w+20)*dir,
					duration : 1,
					easing : 'ease-in'
				}, function(){
					_this._currentTopic.setStyle("display", "none");
					_this._currentTopic = newVisibleTopic;
					Y.Cookie.set("userVisibleTopic", _this._currentTopicNum);
					newVisibleTopic.setStyle("top", 0);
					_this._sliding = false;
				});
	    		
	    		newVisibleTopic.setStyle("left", (w+20)*dir*-1);
				
				newVisibleTopic.transition({
					left: 0,
					duration:1,
					easing: "ease-in"
				});
		    }
	    });
    },
	
    reorderTopicsFinished : function(e){
    	YUI.use('node', function(Y) {
	    	Y.one("#movetopic_instructions").remove(true);
	    	var topics = Y.all("ul.topics-nav li.num").removeClass('move');
	    	topics.each(function(i){
    			var num = topics.indexOf(this);
    			this.setContent(num + 1);
    		});
    	});
    },
    
    reorderTopicsByDrag : function(e){
    	e.preventDefault();
    	_this = this;
    	var cfg = {
				container: '#steps',
				nodes: 'li.num.move',
				opacity: '.5'
			}
    	YUI.use('node', 'event', function(Y){
    		// make dragable
    		if(!Y.one("#movetopic_instructions")) {
	    		var instructions = Y.Node.create("<div id='movetopic_instructions'>" + _this._strings.instructionsForMoving + "</div>");
	    		var button = Y.Node.create("<button name='done' value='done'>Done</button>");
	    		instructions.append(button);
	    		Y.all("ul.topics-nav").insert(instructions,"after");
	    		var topics = Y.all("ul.topics-nav li.num").addClass('move');
	    		Y.Event.attach('click', _this.reorderTopicsFinished, button);
    		}
    		topics.each(function(){
    			this.setContent(this.get('title'));
    		});
    	    _this._reorderingOn = true;
    	});	
    },
    
    editingMoveActivity : function(e) {
       var activity = e.currentTarget.ancestor("li");
       activity.addClass("moving");
       // show instructions
       // show pointers
       YUI.use('node', 'event', function(Y){
         Y.all("li.section").each(function(n){
        	 var modlist = n.one("ul.section");
        	 if(!modlist){
        		 // create ul and li
        		 //var container = Y.one("div.course-content");
        			var modlist = n.create("<ul class=\"section\"><li class=\"movehere\"></li></ul>");
        			n.insert(modlist, n.one("div.section_add_menus"));
        	 } else {
        		 // add in lis
        	 }
        	 
        	 // use movetosection to move to an empty section or end of list
        	 // use moveto to move to place in existing list
         });
       });
       // loop sections li.section
       //   get ul.section || div.section_add_menus
       //   add in lis
       e.preventDefault();
    },
    
    showhideTopic : function(e) {
    	e.preventDefault();
    	var _this = this;
    	var section = e.currentTarget.ancestor("li");
		var sectionId = section.get("id").replace("section-", "");
		var action = e.currentTarget.getAttribute('title') == "Hide topic" ? "hide" : e.currentTarget.getAttribute('title') == "Show topic" ? "show" : null;
		e.currentTarget.addClass("working");
		
		YUI.use('io', 'json-parse', function(Y){
			var uri = "format/slides/ajax_sectionactions.php?";
			var cfg = {
				method: 'POST',
				data: "action=" + action + "&" + "sesskey=" + _this._sesskey + "&" + "courseId=" + _this._courseId + "&" + "sectionId=" + sectionId,
		        on:{
			         complete:showHideComplete
		        },
		        arguments: {
		        	sectionId : sectionId
		        }
			};
			
			function showHideComplete(id, o, args) {
				// TODO: add event listener once instead of removing it each time
			    Y.detach("io:complete", showHideComplete);
			    
			    var responseData = Y.JSON.parse(o.responseText);
			    if(responseData.success) {
			    	_this.loadTopics(args.sectionId);
			        Y.all("#steps li.num").item(parseInt(args.sectionId)).toggleClass("hidden");
			    }
			    e.currentTarget.removeClass("working");
			    
			};
		//	Y.on('io:complete', showHideComplete, Y, [action]);
			var request = Y.io(uri,cfg);
		});
		
    },
    
    highlightTopic : function(e) {
    	e.currentTarget.addClass("working");
    	var _this = this;
    	
    	var section = e.currentTarget.ancestor("li");
    	//var link = e.currentTarget.getAttribute('href');
		var sectionId = !section.hasClass("current") ? section.get("id").replace("section-", "") : 0;
		var action = "mark";

		YUI.use('io', 'json-parse', function(Y){
			var query = "action=mark&" +
						"sesskey=" + _this._sesskey + "&" +
				        "courseId=" + _this._courseId + "&" + 
			            "sectionId=" + sectionId;
			
			var uri = "format/slides/ajax_sectionactions.php?" + query;
			function complete(id, o, args) {
			    var responseData = Y.JSON.parse(o.responseText);
			    var success = responseData.success;
			    var navItem = Y.all("#steps li").removeClass("highlight").item(_this._currentTopicNum);
			    Y.all("li.section").removeClass("current");
			    if(success && responseData.reason == "marked") {
			    	section.addClass("current");
			    	navItem.addClass("highlight");
			    	//e.currentTarget.set("title", "Hide topic");
			    	var imgSrc = e.currentTarget.one("img").get("src").replace("marker", "marked");
			    } else {
			    	var imgSrc = e.currentTarget.one("img").get("src").replace("marked", "marker");
			    }
			    e.currentTarget.one("img").set("src", imgSrc);
			    e.currentTarget.removeClass("working");
			    

			    // TODO: add event listener once instead of removing it each time?
			    Y.detach("io:complete");
			}
			Y.on('io:complete', complete, Y, [action]);
			var request = Y.io(uri);
		});
		
    	e.preventDefault();
    },
    
    init : function(Y, sesskey, courseId, mode, strings) {
    	var _this = this;
    	this._sesskey = sesskey;
    	this._courseId = courseId;
    	this._mode = Number(mode);
    	this._strings = strings;
    	
    	var topics = Y.all("ul#steps li.jump-to.num");
    	var current = Y.one("ul#steps li.jump-to.current").addClass("active");
    	_this._loadedTopics = new Array(topics.size())
    	_this._currentTopic = Y.all("li.section").item(1);
    	_this._currentTopic.addClass("active");
    	_this._currentTopicNum = topics.indexOf(current) +1; //_this._currentTopic.get("id").replace("section-", "");

    	_this._loadedTopics[topics.indexOf(current)] = true;
    	
    	
    	this.loadTopics();
    	
    	Y.one("li.section.outline").setAttribute("style", "display:none;");	
		Y.all("ul.topics-nav li").on('click', this.changeTopic, this, true);
		
		// add links to outline
		Y.all('#section-outline li a').on('click', this.changeTopic, this, true);
		
		/*
		 * EDITING
		 */
		Y.all(".topiccontrols a[title=Move up]").on('click', this.reorderTopicsByDrag, this, true);
		Y.all(".topiccontrols a[title=Move down]").on('click', this.reorderTopicsByDrag, this, true);
		Y.all(".topiccontrols a[title=Hide topic]").on('click', this.showhideTopic, this, true);
		Y.all(".topiccontrols a[title=Show topic]").on('click', this.showhideTopic, this, true);
		Y.all(".topiccontrols a.highlight").on('click', this.highlightTopic, this, true);
		//Y.all(".editing_move").on('click', this.editingMoveActivity, this, true);
		
		
		// move activities
		/*Y.use('dd-delegate', function(Y) {
			var del = new Y.DD.Delegate({
    		   container: '#region-main',
    		   nodes: 'a.editing_move'
    	   });
        });*/
		
		// orderable topics
		Y.use('sortable', function(Y){
			var startIndex;
		    var sortableTopics = new Y.Sortable({
				container: '#steps',
				opacity: '.5',
				nodes  : 'li.num',
				invalid : ':not(.move)'
			});
			
			sortableTopics.delegate.dd.on('drag:start', function(e) {
				startIndex = Y.all('li.num.move').indexOf(this.get('node'));
			});
			
			sortableTopics.delegate.dd.on('drag:end', function(e) {
				// call move ajax
				var section = this.get('node').getAttribute('rel').replace("section-","");
				var moveBy =  Y.all('li.num.move').indexOf(this.get('node')) - startIndex;
				Y.use('io', function(Y){
					var query = "action=move" + "&" +
						        "move=" + moveBy + "&" +
								"sesskey=" + _this._sesskey + "&" +
						        "courseId=" + _this._courseId + "&" + 
					            "sectionId=" + section;
					var uri = "format/slides/ajax_sectionactions.php?" + query;
					function complete(id, o) {
					    var responseData = Y.JSON.parse(o.responseText);
					    var success = responseData.success;
					    if(!success) {
					    	alert("fail - reverse the move");
					    	
					    } else {
					    	// move the section lis
					    	var movedSection = Y.one("#section-"+section);
					    	var topics = movedSection.ancestor("ul");
					    	var offset = moveBy > 0 ? 2 : 1; // +1 works going back +2 works going forward
					    	var newPos = topics.all("li.section").item(section*1+moveBy+offset);
					    	
					    	topics.insertBefore(movedSection, newPos);
					    	topics.all("li.section").each(function(item, index){
					    		var newId = "section-" + (index-1);
					    		if(index > 0) item.set("id", newId);
					    	});
					    	Y.all("#steps li").each(function(item, index){
					    		var newRel = "section-" + (index-1);
					    		if(index > 0) item.setAttribute("rel", newRel);
					    	});
					    	
					    	// update rels and ids
					    }
					    Y.detach("io:complete");
					}
					Y.on('io:complete', complete, Y);
					var request = Y.io(uri);
				});
				e.preventDefault();
			});
		})
		
		// dragable to posn
		Y.use('dd-delegate', function(Y) {
			var del = new Y.DD.Delegate({
				container : '#section-outline',
				nodes : 'li.editing'
			});
			
			del.dd.plug(Y.Plugin.DDConstrained, {
				constrain2node: '#section-outline'
			});
			del.dd.on('drag:end', function(e) {
				var thisNode = this.get("node");
				var xCoord = thisNode.getComputedStyle("left");
				var yCoord = thisNode.getComputedStyle("top");
				var section = thisNode.get("id").replace("topiclink","");
				
				//var courseId = splitQS().id;
				
				// save coords to database
				Y.use('io', function(Y){
					var query = "x="+ xCoord + "&" + 
					            "y=" + yCoord + "&" + 
					            "courseId=" + _this._courseId + "&" + 
					            "sectionId=" + section;
					var uri = "format/slides/ajax_updatetopicposition.php?" + query;
					function complete(id, o, args) {
					    var responseData = o.reponseText;
					    var args = args[1];
					}
					Y.on('io:complete', complete, Y, [xCoord, yCoord]);
					var request = Y.io(uri);
				});
				
			});
		});
    }
}

// should use Y.QueryString.parse() but...
function splitQS(qs) {
	alert('deprecated');
	var qsObj = new Object();
	qs = qs || document.location.search.substring(1);
	var qsArr = qs.split("&");
	for(var i=0; i<qsArr.length; i++){
		var item = qsArr[i];
		qsObj[item.split("=")[0]] = item.split("=")[1]
	}
	return qsObj;
}