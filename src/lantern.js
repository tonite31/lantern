/**
 * lantern v0.1.3
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
		
		this.custom = {};
		
		this.elementListForDataChanging = [];
		
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
				if(key.indexOf('.') != -1)
				{
					var last = null;
					var split = key.split('.');
					if(split.length > 0)
					{
						if(!this.data.hasOwnProperty(split[0]))
							this.data[split[0]] = last = {};
						else
							last = this.data[split[0]];
						
						for(var j=1; j<split.length; j++)
						{
							if(!last.hasOwnProperty(split[j]))
							{
								if(split[j+1])
									last = last[split[j]] = {};
								else
									last = last[split[j]] = undefined;
							}
						}
					}
				}
				else
				{
					if(!this.data.hasOwnProperty(key))
						this.data[key] = undefined;
				}
			}
		}
		
		var html = this.element.innerHTML.replace(/{{/gi, '{{' + this.id + ':');
		matchList = html.match(/<[^>]*{{[^}]*}}[^>]*>/gi);
		if(matchList)
		{
			for(var i=0; i<matchList.length; i++)
			{
				html = html.replace(matchList[i], matchList[i].replace(">", " data-lantern>"));
			}
		}
		
		matchList = html.match(/<[^>]*{body}[^>]*>/gi);
		if(matchList)
		{
			for(var i=0; i<matchList.length; i++)
			{
				html = html.replace(matchList[i], matchList[i].replace(">", " data-lantern-body>"));
			}
		}
		
		this.element.innerHTML = html;
		
		var checkAttrData = function(element)
		{
			for(var j=0; j<element.attributes.length; j++)
			{
				var value = element.attributes[j].value;
				if(value.match(/{{[^}]*}}/gi))
				{
					if(value.indexOf(":") == -1)
					{
						value = value.replace(/{{/gi, '{{' + this.id + ':');
						element.attributes[j].value = value;
					}
					
					if(!element.changing)
					{
						element.changing = {};
						this.elementListForDataChanging.push(element);
					}
					
					element.changing[element.attributes[j].name] = value;
				}
			}
			
			element.removeAttribute("data-lantern");
		};
		
		var elementList = this.element.querySelectorAll("*[data-lantern]");
		for(var i=0; i<elementList.length; i++)
			checkAttrData.call(this, elementList[i]);
		
		checkAttrData.call(this, this.element);
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
	
	Component.prototype.getNodeList = function(parentKey, data, oldData)
	{
		var that = this;
		var nodeList = [];
		for(var key in data)
		{
			if(typeof data[key] == 'object')
			{
				var result = this.getNodeList(key, data[key], oldData[key]);
				for(var i=0; i<result.length; i++)
					nodeList.push(result[i]);
			}
			else
			{
				if((!oldData || data[key] != oldData[key]) || (data.hasOwnProperty(key) && (!oldData || !oldData.hasOwnProperty(key)))) //최초 컴포넌트 템플릿에 명시되어있는 데이터 중에서 바뀐것만 체크한다. 그럼 스코프 체크하..... 키값이 동일하다면 문제가 될듯.
				{
					var filter = function(node)
					{
						var regx = new RegExp("{{" + that.id + ":" + (parentKey ? parentKey + '.' : '') + key + "}}", "gi");
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
		}
		
		return nodeList;
	};

	Component.prototype.bindData = function()
	{
		var that = this;
		var nodeList = this.getNodeList('', this.data, this.oldData);
		
		for(var key in this.data)
		{
			if(typeof this.data[key] == 'object')
			{
				var data = this.data[key];
			}
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
			
			if(!node.parentElement)
				continue;
			
			var text = node.originalText;
			if(!text)
				text = node.originalText = node.textContent;
			
			var matchList = text.match(/{{[^}]*}}/gi);
			if(matchList)
			{
				for(var j=0; j<matchList.length; j++)
				{
					var key = matchList[j].replace("{{", "").replace("}}", "");
					key = key.split(":")[1];
					if(key.indexOf('.') != -1)
					{
						var last = null;
						var split = key.split('.');
						if(split.length > 0)
						{
							last = this.data[split[0]];
							for(var k=1; k<split.length; k++)
							{
								last = last[split[k]];
							}
						}
						
						text = text.replace(matchList[j], last);
					}
					else
					{
						text = text.replace(matchList[j], this.data[key]);
					}
				}
				
				var newNode = document.createTextNode(text);
				newNode.originalText = node.originalText;

				node.parentElement.replaceChild(newNode, node);
			}
		}
		
		for(var i=0; i<this.elementListForDataChanging.length; i++)
		{
			for(var attrKey in this.elementListForDataChanging[i].changing)
			{
				var value = this.elementListForDataChanging[i].changing[attrKey];
				var matchList = value.match(/{{[^}]*}}/gi);
				if(matchList)
				{
					for(var j=0; j<matchList.length; j++)
					{
						var key = matchList[j].replace("{{", "").replace("}}", "");
						var scope = key.split(":");
						key = scope[1];
						scope = scope[0];
						
						if(scope == this.id)
							value = value.replace(matchList[j], this.data[key]);
						
						this.elementListForDataChanging[i].setAttribute(attrKey, value);
					}
				}
			}
		}
		
		this.oldData = JSON.parse(JSON.stringify(this.data));
	};
	
	Component.prototype.bindBody = function(target)
	{
		var nodeList = [];
		var filter = function(node)
		{
			var regx = new RegExp("{body}", "gi");
			return regx.test(node.textContent);
		};
		
		var node = null;
		var walker = document.createTreeWalker(this.element, NodeFilter.SHOW_TEXT, filter, false);
		while(node = walker.nextNode())
		{
			nodeList.push(node);
		}
		
		for(var i=0; i<nodeList.length; i++)
		{
			var node = nodeList[i];
			var text = node.textContent;
			var matchList = text.match(/{body}/gi);
			if(matchList)
			{
				var isChanged = false;
				for(var j=0; j<matchList.length; j++)
				{
					text = text.replace(matchList[j], "<bindBodyTarget></bindBodyTarget>");
				}

				//만약 tbody등의 것들이 왔을때 없어질수도 있는데.
				var nodeName = text.trim().toLowerCase();
				var type = 'div';
				if(nodeName.substring(1, 3) == 'tr' || nodeName.substring(1, 3) == 'td' || nodeName.substring(1, 3) == 'th')
					type = 'tbody';
				else if(nodeName.substring(1, 4) == 'col')
					type = 'colgroup';
				else if(nodeName.substring(1, 9) == 'colgroup' || nodeName.substring(1, 6) == 'thead' || nodeName.substring(1, 6) == 'tbody' || nodeName.substring(1, 6) == 'tfoot' || nodeName.substring(1, 8) == 'caption')
					type = 'table';
				
				var div = document.createElement(type);
				div.innerHTML = text;
				
				var body = div.querySelector("bindBodyTarget");
				while(target.childNodes.length > 0)
					div.insertBefore(target.childNodes[0], body);
				
				div.removeChild(body);
				
				var frag = divument.createDocumentFragment();
				while(div.childNodes.length > 0)
					frag.appendChild(div.childNodes[0]);
				
				node.parentElement.replaceChild(frag, node);
			}
		}
		
		var elementList = this.element.querySelectorAll("*[data-lantern-body]");
		for(var i=0; i<elementList.length; i++)
		{
			for(var j=0; j<elementList[i].attributes.length; j++)
			{
				var value = elementList[i].attributes[j].value;
				if(value.match(/{body}/gi))
				{
					elementList[i].attributes[j].value = value.replace(/{body}/, target.innerText);
				}
			}
			
			elementList[i].removeAttribute("data-lantern-body");
		}
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
		this.custom = {};
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
				if(attr.name == "class")
				{
					var classList = attr.value.split(" ");
					for(var j=0; j<classList.length; j++)
					{
						if(classList[j].trim())
							component.element.classList.add(classList[j]);
					}
				}
				else
				{
					component.setAttribute(attr.name, attr.value);
				}
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
		
		//아래 두개 순서가 바뀌면 node.originalText 변수가 날아가서 데이터 바인딩이 제대로 안된다.
		//body를 먼저 바인드해도 스코프를 유지해서 바인드 하도록 처리해뒀기 때문에 괜찮다.
		component.bindBody(target);
		component.bindData();

		if(target.parentElement)
		{
			var isEquals = component.element.querySelector(target.nodeName);
			if(isEquals)
			{
				throw "Target '" + target.nodeName + "' is equals to '" + isEquals.nodeName + "' in " + component.element.outerHTML;
				target.parentElement.removeChild(target);
				return;
			}
			
			target.parentElement.replaceChild(component.element, target);
		}
		
		lantern.compile(component.element);
		
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
		
		if(this.custom)
		{
			for(var key in this.custom)
			{
				var that = this;
				component.custom[key] = function()
				{
					that.custom[key].apply(component, arguments);
				};
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
				(function(element)
				{
					var callback = this.callback;
					element.addEventListener(event.eventName, function(e)
					{
						element.lantern = component;
						callback.call(element, e);
					}, this.useCapture);
				}).call(event, element[j]);
			}
		}
		
		return component.element;
	};
	
	/**
	 * -----------------------------------------------------------------------------
	 */
	
	this.factory = {};
	
	this.create = function(id, html)
	{
		if(typeof html == "string")
		{
			var nodeName = html.trim().toLowerCase();
			var type = 'div';
			if(nodeName.substring(1, 3) == 'tr' || nodeName.substring(1, 3) == 'td' || nodeName.substring(1, 3) == 'th')
				type = 'tbody';
			else if(nodeName.substring(1, 4) == 'col')
				type = 'colgroup';
			else if(nodeName.substring(1, 9) == 'colgroup' || nodeName.substring(1, 6) == 'thead' || nodeName.substring(1, 6) == 'tbody' || nodeName.substring(1, 6) == 'tfoot' || nodeName.substring(1, 8) == 'caption')
				type = 'table';
			
			var div = document.createElement(type);
			div.innerHTML = html;
				
			return this.factory[id] = new Factory(id, div.children[0]);
		}
		else
		{
			throw "html of '" + id + "' is not string."
			return null;
		}
	};
	
	this.compile = function(element, name)
	{
		if(name)
		{
			var factory = this.factory[name];
			if(factory)
				element = factory.create(element);
			else
				throw "Cloud not found '" + name + "'";
			
			this.setParent(element);
			
			return element.lantern;
		}
		else
		{
			for(var key in this.factory)
			{
				var factory = this.factory[key];
				
				var list = element.querySelectorAll(key);
				var length = list.length;
				for(var i=0; i<length; i++)
				{
					list[i].setAttribute("data-lantern-object", "");
					factory.create(list[i]);
				}
			}

			var list = element.querySelectorAll("*[data-lantern-object]");
			for(var i=0; i<list.length; i++)
			{
				this.setParent(list[i]);
				list[i].removeAttribute("data-lantern-object");
			}
		}
	};
	
	this.setParent = function(element)
	{
		var parent = element.parentElement;
		while(parent && parent != document.body)
		{
			if(parent.lantern)
			{
				element.lantern.parent = parent.lantern;
				break;
			}
			else
			{
				parent = parent.parentElement;
			}
		}
	};
	
}).call(lantern);

var $ = $ ? $ : false;

(function()
{
	if($)
	{
		$(document).ready(function()
		{
			lantern.compile(document.body);
		});
	}
	else
	{
		window.addEventListener("load", function()
		{
			lantern.compile(document.body);
		});
	}
})();