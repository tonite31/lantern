# Lantern

Lantern is a JavaScript library for building user interfaces.

Lantern borrowed an idea and example sources from react.

## Example
```
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>HelloWorld</title>
<script src="../../src/lantern.js"></script>

<script type="text/lantern" id="HelloWorld">
<h1>Hello {{name}}!</h1>
</script>
	
<script type="text/javascript">
var HelloWorld = lantern.create("HelloWorld", document.getElementById("HelloWorld").innerHTML);
HelloWorld.data.name = "your name";
</script>
</head>
<body>
	<HelloWorld></HelloWorld>
</body>
</html>
```
see [jsfiddle](https://jsfiddle.net/Alprensia/w8gr05sn/3/)

#### Using "data-" attribute
```
<HelloWorld data-name="Lantern"></HelloWorld>
```
see [jsfiddle](https://jsfiddle.net/Alprensia/0yz7kfef/1/)

#### Bind event to component
```
var HelloWorld = lantern.create("HelloWorld", "<h1>Hello {{name}}!</h1>");
HelloWorld.data.name = "your name";
HelloWorld.bind(null/*selector*/, "click", function() //If first parameter is null, then bind event to top element. in this case, '<h1>'.
{
	alert("Hello " + this.data.name + "!");
});
```
see [jsfiddle](https://jsfiddle.net/Alprensia/cv9dujod/1/)

```
var HelloWorld = lantern.create("HelloWorld", "<div><h1>Hello {{name}}!</h1><button type='button'>Click here!</button></div>");
HelloWorld.data.name = "Lantern";
HelloWorld.bind("button", "click", function() //If first parameter is null, then bind event to top element. in this case, '<h1>'.
{
	alert("Hello " + this.data.name + "!");
});
```
see [jsfiddle](https://jsfiddle.net/Alprensia/0yz7kfef/2/)

#### Dynamic update
```
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Basic Example</title>

<link rel="stylesheet" href="../shared/css/base.css" />

<script src="../../src/lantern.js"></script>

<script type="text/lantern" id="ExampleApplication">
<p>Lantern has been successfully running for {{seconds}} seconds.</p>
</script>
	
<script type="text/javascript">
var ExampleApplication = lantern.create("ExampleApplication", document.getElementById("ExampleApplication").innerHTML);
ExampleApplication.data.seconds = 0;

window.addEventListener("load", function()
{
	var start = new Date().getTime();
	var container = document.getElementById("container");
	
	setInterval(function()
	{
		container.lantern.update(function()
		{
			var elapsed = new Date().getTime() - start;
			elapsed = Math.round(elapsed  / 100);
			
			this.data.seconds = elapsed / 10 + (elapsed % 10 ? '' : '.0' );
		});	
	}, 50);
});
</script>
</head>
<body>
<h1>Basic Example</h1>
<ExampleApplication id="container"></ExampleApplication>
</body>
</html>
```
see [jsfiddle](https://jsfiddle.net/Alprensia/2kzfphmt/1/)

#### If you want to manipulate data on loaded component.
```
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>HelloWorld</title>
<script src="../../src/lantern.js"></script>
	
<script type="text/javascript">
var HelloWorld = lantern.create("HelloWorld", "<h1>Result is {{result}}.</h1>");
HelloWorld.life =
{
	onLoad : function()
	{
		this.data.result = parseInt(this.data.num1) + parseInt(this.data.num2);
	}
};
</script>
</head>
<body>
	<HelloWorld data-num1="10" data-num2="20"></HelloWorld>
</body>
</html>
```
see [jsfiddle](https://jsfiddle.net/Alprensia/ah5nryf6/1/)