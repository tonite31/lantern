/**
 * lantern v0.0.1
 */

/**
 * 여기엔 고민이나 해야할것들.
 */

var lantern = {};

(function()
{
	var Component = function(data, element)
	{
		this.oldData = {};
		this.data = data;
		this.element = element;
		this.element.lantern = this;
	};

	Component.prototype.update = function(func)
	{
		if(func)
			func.call(this);
		
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
	
	Factory.prototype.create = function(target)
	{
		var component = new Component(this.data, this.element.cloneNode(true));
		
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
				if(typeof component.data[attr.name] == "number")
					component.data[attr.name] = new Number(attr.value);
				else
					component.data[attr.name] = attr.value;
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
		
		component.bindData();
		
		if(this.life.onLoad)
		{
			this.life.onLoad.call(component, function()
			{
				target.parentElement.replaceChild(component.element, target);
				lantern.compile(component.element);
			});
		}
		else
		{
			target.parentElement.replaceChild(component.element, target);
			lantern.compile(component.element);
		}
	};
	
	/**
	 * -----------------------------------------------------------------------------
	 */
	
	this.componentList = {};
	
	this.create = function(id, html)
	{
		var div = document.createElement("div");
 		div.innerHTML = html;
		
		return this.componentList[id] = new Factory(id, div.children[0]);
	};
	
	this.compile = function(doc)
	{
		for(var key in this.componentList)
		{
			var factory = this.componentList[key];
			
			var list = doc.querySelectorAll(key);
			var length = list.length;
			for(var i=0; i<length; i++)
			{
				factory.create(list[i]);
			}
		}
	};
}).call(lantern);

(function()
{
	window.addEventListener("load", function()
	{
		lantern.compile(document);
	});
})();