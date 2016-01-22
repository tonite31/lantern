/**
 * lantern v0.1.0
 */

var lantern = {};

(function()
{
	var Component = function(data, element, parent)
	{
		this.oldData = {};
		this.data = data;
		this.element = element;
		this.element.lantern = this;
		this.parent = parent;
		this.children = [];
		if(this.parent)
			this.parent.children.push(this);
	};

	Component.prototype.update = function(func)
	{
		if(func)
		{
			if(func.length == 1)
			{
				func.call(this, function()
				{
					this.bindData();
				});
				
				return;
			}
			else
			{
				func.call(this);
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
		var nodeList = [];
		
		//데이터가 달라진것만 찾아서 교체한다.
		//스코프 유지를 위해 children을 임시로 제거했다가 붙인다.
		for(var i=0; i<this.children.length; i++)
		{
			this.children[i].element._parentElement = this.children[i].element.parentElement;
			this.children[i].element.parentElement.removeChild(this.children[i].element);
		}
		
		for(var key in this.data)
		{
			if(this.data[key] != this.oldData[key])
			{
				var filter = function(node)
				{
					var regx = new RegExp("{{" + key + "}}", "gi");
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
		
		for(var i=0; i<this.children.length; i++)
			this.children[i].element._parentElement.appendChild(this.children[i].element);
		
		//ie는 노드필터랑 필터함수를 지원 못한다고 그랬는데...
		for(var i=0; i<nodeList.length; i++)
		{
			var node = nodeList[i];
			
			var text = node.originalText;
			if(!text)
				text = node.originalText = node.textContent;
			
			var matchList = text.match(/{{[^}]*}}/gi);
			if(matchList)
			{
				for(var j=0; j<matchList.length; j++)
				{
					var key = matchList[j].replace("{{", "").replace("}}", "");
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
		var html = this.element.innerHTML;
		var matchList = html.match(/{body}/gi);
		if(matchList)
		{
			for(var i=0; i<matchList.length; i++)
			{
				html = html.replace(matchList[i], body);
			}
		}
		
		this.element.innerHTML = html;
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
		
		component.bindData();
		component.bindBody(target.innerHTML);
		
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

			var id = new Date().getTime();
			doc.setAttribute("data-lantern-id", id);
			
			var list = doc.parentElement.querySelectorAll(doc.nodeName + "[data-lantern-id='" + id + "'] > " + key);
			var length = list.length;
			for(var i=0; i<length; i++)
			{
				factory.create(list[i], doc.lantern ? doc.lantern : null);
			}
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