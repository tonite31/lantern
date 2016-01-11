# Lantern

Lantern is a JavaScript library for building user interfaces.

## Example
```
<script type="text" id="HelloWorld">
<span style="font-size: 20px; border: 1px solid #ccc; margin-top: 50px; display: inline-block; padding: 5px;">Hellow {{name}}!</span>
</script>

var HelloWorld = lantern.create("HelloWorld", document.getElementById("HelloWorld").innerHTML);
HelloWorld.name = "your name";
```
use
```
<HelloWorld></HelloWorld>
```