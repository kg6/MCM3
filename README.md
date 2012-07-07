# MCM3

A simple Monte Carlo method editor using [d3.js](http://d3js.org/), [jQuery](http://jquery.com/) and [Twitter Bootstrap](http://twitter.github.com/bootstrap/) by [Claus Schabetsberger](mailto:claus.schabetsberger@gmail.com) and [Markus Zimmermann](mailto:markus.zimmermann@nethead.at).


## What does the Monte Carlo method do?

The idea of the Monte Carlo method is to sample randomly as often as possible to approximate a certain area. It is used in practice for approximation if the exact value can not be computed (easily). Have a look at the excellent Wikipedia article on the [Monte Carlo method](https://en.wikipedia.org/wiki/Monte_Carlo_method) if you want to know more.

We show the functionality of this method by applying it to a given function that can be defined by the user of the application. After drawing the function and sampling a huge amount of random dots, the Monte Carlo method allows us to approximate the area between the function and the x axis by relating the count of dots between the function curve and the x axis to the total count of dots multiplied by the used area of the diagram, all without computing the definite integral of the function. For example if the function spans a diagram area from 1 to 4 on the x axis and from 2 to 10 on the y axis we use an area of (4 - 1) * (10 - 2) = 24. If we have have a total of 75% sample dots between the function curve and the x axis we would approximate an area of 24 * 0.75 = 18 for the given function.


## Why is there an option for random.org?

Random data of normal computers is not really random. Often clever algorithms and the current time or other pseudo random data as a seed for the generation are used. This is great and in general enough for most applications but not for security or money making applications as this kind of generation has a major flaw. A subset of the randomness can be predicted and therefore there is a good chance to predict the generated random data.

To overcome this weakness [random.org](http://www.random.org/) for example uses atmospheric noise to generate random bits. For our experiments, hence the creation of this application, we also wanted to show the difference between a true random number generator and a pseudo random generator.

Please note that random.org has a quota of about one million numbers per day and [other restrictions](http://www.random.org/faq/).


## How do i use MCM3?

MCM3 is very easy to use. Just clone the project and open index.html with your browser. Please note that you should use at least a width of 1024 pixels for the browser window and you have to use a modern browser. We tested the application with Mozilla Firefox 13, Chrome 21 and Opera 11.64. A modern and up to date browser is a very important requirement as we use "modern" browser features and the diagram also needs a fast JavaScript engine to work properly.

To execute the Monte Carlo method you have to define a function which will be drawn as a diagram. This function does not have to be mathematical. You can define anything you want as long as there is for every input x coordination an output. For the Monte Carlo method itself you can adjust the number of samples that will be used to approximate the area of the function between the function curve and the x axis. To draw your function and apply the Monte Carlo method you simply have to press the big green button at the bottom.

The drawn function is pure JavaScript code with nearly no limitations. As long as you return a value for every x you are good to go.

For example this defines a rather complex but valid function

``` javascript
(x - 350)*(x - 350) * Math.cos(x / 100) * -1 * Math.sin(x / 100)
```

You can also go wild and use non-mathematical operators and constructs. This is for example a simple bandpass filter

``` javascript
function(){
	var bandPass = 0.3
	var y = Math.sin(x / 30);

	return (y > bandPass) ? bandPass : (y < -bandPass) ? -bandPass : y;
}()
```
