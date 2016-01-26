/**
 * lantern v0.1.0
 */

var lantern = {};

(function()
{
	function extend(target)
	{
	    var sources = [].slice.call(arguments, 1);
	    sources.forEach(function (source) {
	        for (var prop in source) {
	            target[prop] = source[prop];
	        }
	    });
	    return target;
	};
	
	function generateUUID()
	{
	    var d = new Date().getTime();
	    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	        var r = (d + Math.random()*16)%16 | 0;
	        d = Math.floor(d/16);
	        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	    });
	    return uuid;
	};
	
	var Component = function(data, element, parent)
	{
		//이 시점에는 스크립트 템플릿만 들어있다. 하위 컴포넌트는 {body}로 들어있음.
		this.id = generateUUID();
		this.element = element;
		this.element.lantern = this;
		
		this.parent = parent;
		this.children = [];
		if(this.parent)
			this.parent.children.push(this);
		
		this.oldData = {};
		this.data = extend({}, data);
		
		this.init();
	};
	
	Component.prototype.init = function()
	{
		var matchList = this.element.innerHTML.match(/{{[^}]*}}/gi);
		if(matchList)
		{
			for(var i=0; i<matchList.length; i++)
			{
				var key = matchList[i].replace("{{", "").replace("}}", "");
				this.data[key] = undefined;
			}
		}
		
		this.element.innerHTML = this.element.innerHTML.replace('{{', '{{' + this.id + ':');
	};

	Component.prototype.update = function(func)
	{
		if(func)
		{
			if(func.length == 1)
			{
				var that = this;
				func.call(this, function()
				{
					that.bindData();
				});
				
				return;
			}
			else
			{
				func.call(this);
				for(var i=0; i<this.children.length; i++)
				{
					this.children[i].update();
				}
			}
		}
		
		this.bindData();
	};

	Component.prototype.setAttribute = function(key, value)
	{
		this.element.setAttribute(key, value);
	};

	Component.prototype.bindData = function()
	{
		var that = this;
		var nodeList = [];
		
		for(var key in this.data)
		{
			if((this.data[key] != this.oldData[key]) || (this.data.hasOwnProperty(key) && !this.oldData.hasOwnProperty(key))) //최초 컴포넌트 템플릿에 명시되어있는 데이터 중에서 바뀐것만 체크한다. 그럼 스코프 체크하..... 키값이 동일하다면 문제가 될듯.
			{
				var filter = function(node)
				{
					var regx = new RegExp("{{" + that.id + ":" + key + "}}", "gi");
					return node.originalText ? regx.test(node.originalText) : regx.test(node.textContent);
				};
				
				var node = null;
				var walker = document.createTreeWalker(this.element, NodeFilter.SHOW_TEXT, filter, false);
				while(node = walker.nextNode())
				{
					nodeList.push(node);
				}
			}
		}
		
		for(var i=0; i<nodeList.length; i++)
		{
			var node = nodeList[i];
			
			var text = node.originalText;
			if(!text)
				text = node.originalText = node.textContent;
			
			var matchList = text.match(/{{[^}]*}}/gi);
			if(matchList)
			{
				var isChanged = false;
				for(var j=0; j<matchList.length; j++)
				{
					var key = matchList[j].replace("{{", "").replace("}}", "");
					key = key.split(":")[1];
					text = text.replace(matchList[j], this.data[key]);
				}
				
				var newNode = document.createTextNode(text);
				newNode.originalText = node.originalText;

				node.parentElement.replaceChild(newNode, node);
			}
		}
		
		this.oldData = JSON.parse(JSON.stringify(this.data));
	};
	
	Component.prototype.bindBody = function(body)
	{
		this.element.innerHTML = this.element.innerHTML.replace(/{body}/gi, body);
	};
	
	/**
	 * Factory 실제 컴포넌트 객체를 생성하는 공장
	 */
	var Factory = function(id, element)
	{
		this.id = id;
		this.element = element;
		this.eventList = [];
		this.life = {onLoad : null};
		this.data = {};
	};

	Factory.prototype.bind = function(target, eventName, callback, useCapture)
	{
		this.eventList.push({target : target, eventName : eventName, callback : callback, useCapture : useCapture});
	};
	
	Factory.prototype.create = function(target, parent)
	{
		var component = new Component(this.data, this.element.cloneNode(true), parent);
		
		/**
		 * 타겟의 속성으로부터 속성과 데이터속성을 분리하는 과정
		 */
		var attributes = target.attributes;
		for(var i=0; i<attributes.length; i++)
		{
			var attr = attributes[i];
			if(attr.name.indexOf("data-") == -1)
			{
				component.setAttribute(attr.name, attr.value);
			}
			else
			{
				var name = attr.name.replace("data-", "");
				if(typeof component.data[name] == "number")
					component.data[name] = new Number(attr.value);
				else
					component.data[name] = attr.value;
			}
		}
		
		/**
		 * 이벤트 바인딩하는 부분
		 */
		var length = this.eventList.length;
		for(var i=0; i<length; i++)
		{
			var event = this.eventList[i];
			
			var element = [];
			if(typeof event.target == "string")
			{
				element = component.element.querySelectorAll(event.target);
			}
			else if(event.target == null)
			{
				element.push(component.element); // target이 null인경우는 자신한테 이벤트 바인딩.
			}
			else
			{
				element.push(event.target);
			}
			
			var elementLength = element.length;
			for(var j=0; j<elementLength; j++)
			{
				(function()
				{
					var callback = this.callback;
					element[j].addEventListener(event.eventName, function(e)
					{
						callback.call(component, e);
					}, this.useCapture);
				}).call(event);
			}
		}
		
		if(this.life.onLoad)
		{
			if(this.life.onLoad.length == 1)
			{
				this.life.onLoad.call(component, function()
				{
					component.bindData();
					target.parentElement.replaceChild(component.element, target);
					lantern.compile(component.element);
				});
				
				return;
			}
			else
			{
				this.life.onLoad.call(component);
			}
		}
		
		//아래 두개 순서가 바뀌면 node.originalText 변수가 날아가서 데이터 바인딩이 제대로 안된다.
		//body를 먼저 바인드해도 스코프를 유지해서 바인드 하도록 처리해뒀기 때문에 괜찮다.
		component.bindBody(target.innerHTML);
		component.bindData();
		
		if(target.parentElement)
			target.parentElement.replaceChild(component.element, target);
		
		lantern.compile(component.element);
	};
	
	/**
	 * -----------------------------------------------------------------------------
	 */
	
	this.factory = {};
	
	this.create = function(id, html)
	{
		var div = document.createElement("div");
 		div.innerHTML = html;
		
		return this.factory[id] = new Factory(id, div.children[0]);
	};
	
	this.compile = function(doc)
	{
		for(var key in this.factory)
		{
			var factory = this.factory[key];

			var id = generateUUID();
			doc.setAttribute("data-lantern-id", id);
			
			if(doc.parentElement)
			{
				var list = doc.parentElement.querySelectorAll(doc.nodeName + "[data-lantern-id='" + id + "'] > " + key);
				var length = list.length;
				for(var i=0; i<length; i++)
				{
					factory.create(list[i], doc.lantern ? doc.lantern : null);
				}
			}
			
			doc.removeAttribute("data-lantern-id");
		}
	};
	
}).call(lantern);

(function()
{
	window.addEventListener("load", function()
	{
		lantern.compile(document.body);
	});
})();