# Lantern

Lantern is a JavaScript library for building user interfaces.
- ##### From React : <span style="font-weight:normal;">Lantern borrowed an idea and example sources from react.</span>

## Example
```
<script type="text/lantern" id="HelloWorld">
<h1>Hello {{name}}!</h1>
</script>

var HelloWorld = lantern.create("HelloWorld", document.getElementById("HelloWorld").innerHTML);
HelloWorld.data.name = "your name";
```
use HelloWorld component.
```
<HelloWorld></HelloWorld>
```

### Inline html
```
var HelloWorld = lantern.create("HelloWorld", "<h1>Hello {{name}}!</h1>");
```

### Life cycle
```
var HelloWorld = lantern.create("HelloWorld", "<h1>Hello {{name}}!</h1>");
HelloWorld.data.name = "your name";
HelloWorld.life =
{
	onLoad : function()
	{
		this.data.name = "Baby";
	}
};
```

### Bind event
```
var HelloWorld = lantern.create("HelloWorld", "<h1>Hello {{name}}!</h1>");
HelloWorld.data.name = "your name";
HelloWorld.bind(null/*selector*/, "click", function() //If first parameter is null, then bind event to top element. in this case, '<h1>'.
{
	alert("Hello!");
});
```

### Update data
```
var HelloWorld = lantern.create("HelloWorld", "<h1>Hello {{name}}!</h1>");
HelloWorld.data.name = "your name";
HelloWorld.bind(null/*selector*/, "click", function()
{
	this.update(function()
	{
		this.data.name = "Baby";
	});
});
```