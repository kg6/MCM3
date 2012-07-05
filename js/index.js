// define the scale of our diagram canvas
var margin = { top: 0, right: 0, bottom: 0, left: 60 },
	width = 700 - margin.left - margin.right,
	height = 600 - margin.top - margin.bottom;

var x_min, x_max, y_min, y_max;
	
var svg;
var scale_x, scale_y;

function setup() {
	// react on value changes of the samples select
	$('#samples').change(function() {
		$('#montefunc').val($('#samples option:selected').text());
	});

	// react on clicks of the start button
	$('#start').click(function() {
		// create our mathematical function
		var montefunc = $('#montefunc').val();
		
		var f = function(x) {
			var y = 0;
			
			eval('y = ' + montefunc + ';');
			
			return y;
		}
		
		// validate the function
		try {
			eval(f(1)); 
		}
		catch (e) {
			// this function is not valid JavaScript code so alert the user and exit the function
			alert(e);
			
			return false;
		}

		// reset our view
		resetMonteCarloMethod();
		
		x_min = 0;
		x_max = width - 1;
		y_min = 0.0;
		y_max = 0.0;

		// create the function (x,y) coordinates
		var data = [];
		
		for (var i = 0; i < width; i++) {
			var e = { x: i, y: f(i) };
			
			if (e.y > y_max) y_max = e.y;
			if (e.y < y_min) y_min = e.y;
			
			data.push(e);
		}

		// create the scales of the diagram
		scale_x = d3.scale.linear()
			.domain([0, width])
			.range([0, width]);

		scale_y = d3.scale.linear()
			.domain([y_min - Math.abs(y_min / 10.0), y_max + (y_max / 10.0)])
			.range([height, 0]);

		// create the canvas for the diagram
		svg = d3.select('#canvas').append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		// calculate where the 0-y-axis is on our canvas
		var nu = 100 / (Math.abs(y_min) + Math.abs(y_max)) * Math.abs(y_max) * (height / 100.0);

		// add a "shadow" for the function path, this is the area we want to recognize via monte carlo
		var area = d3.svg.area()
			.x(function(d) { return scale_x(d.x); })
			.y0(nu)
			.y1(function(d) { return scale_y(d.y); });
		svg.append('clipPath')
			.attr('id', 'clip')
			.append('svg:rect')
				.attr('width', width)
				.attr('height', height);
		svg.append('path')
			.attr('class', 'area')
			.attr('clip-path', 'url(#clip)')
			.attr('d', area(data));

		// add the function path
		var line = d3.svg.line()
			.x(function(d) { return scale_x(d.x); })
			.y(function(d) { return scale_y(d.y); });

		svg.append('path')
			.attr('class', 'line')
			.attr('clip-path', 'url(#clip)')
			.attr('d', line(data));

		// add the x and y axis to the diagram
		var xAxis = d3.svg.axis()
			.scale(scale_x)
			.ticks(20)
			.orient('bottom');
		svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + nu + ')')
			.call(xAxis);

		var yAxis = d3.svg.axis()
			.scale(scale_y)
			.ticks(20)
			.orient('left');
		svg.append('g')
			.attr('class', 'y axis')
			.call(yAxis);
		
		// fetch the number of dots we have to generate
		var num_samples = parseInt($('#num_samples').val(), 10);
		
		// fetch a own set for the X and Y coordinates of the dots
		var x_rnd_values = null;
		var y_rnd_values = null;

		requestRandomNumbers(num_samples, x_min, x_max, function(values) {
			x_rnd_values = values;
			
			processMonteCarloMethod($('#montefunc').val(), x_rnd_values, y_rnd_values, drawApproximationPoint, displayMonteCarloMethodResult);
		});

		requestRandomNumbers(num_samples, y_min, y_max, function(values) {
			y_rnd_values = values;
			
			processMonteCarloMethod($('#montefunc').val(), x_rnd_values, y_rnd_values, drawApproximationPoint, displayMonteCarloMethodResult);
		});

		// do not submit the form!
		return false;
	});
}

// fetch random numbers and execute the callback function if possible
function requestRandomNumbers(numbercount, normalize_min, normalize_max, callback) {
	var max = 1000000000;
	
	var af = (normalize_max - normalize_min);

	// should we use random.org?
	if ($('#userandorg').is(':checked')) {
		$.ajax({
			url: 'http://www.random.org/integers/?num=' + numbercount + '&min=' + 0 + '&max=' + max + '&col=1&base=10&format=plain&rnd=new',
			cache: false,
			error: function(jqXHR, textStatus, errorThrown) {
					alert('Request to random.org failed. Maybe you reached the request limit of random.org? The error message is: ' + errorThrown);
			}
		}).done(function (data) {
			
			var numbers = data.split("\n");
			
			for(var i = 0; i < numbers.length; i++) {
				// map the random number to our value range
				numbers[i] = parseInt(numbers[i], 10) / max;
				numbers[i] = numbers[i] * af + normalize_min
			}
			
			if (callback != null)
				callback(numbers);
		});
	}
	else { // use JavaScript random numbers
		var numbers = [];
		
		for(var i = 0; i < numbercount; i++) {
			// map the random number to our value range
			numbers.push(Math.random() * af + normalize_min);
		}
		
		if (callback != null)
			callback(numbers);
	}
}

// execute the monte carlo method
function processMonteCarloMethod(func, rnd_x_values, rnd_y_values, datapoint_callback, result_callback) {
	// check if the coordination data is already there
	if(rnd_x_values == null || rnd_y_values == null)
		return;
	
	// create our mathematical function
	var f = function(x) {
		var y = 0;
		
		eval('y = ' + func + ';');
		
		return y;
	}
	
	//counter for positive/negative examples
	var pos = 0;
	var neg = 0;
	
	// go through every x-y-coordination data
	var max = Math.min(rnd_x_values.length, rnd_y_values.length);
	for (var i = 0; i < max; i++) {
		// calculate the Y function value of the X coordinate
		var y = f(rnd_x_values[i]);
		
		// check if this dot is in positive area
		
		if (y >= 0) { // y >= 0
			// is this dot in the curve?
			if (rnd_y_values[i] >= 0 && rnd_y_values[i] <= y) {
				pos++;
				
				datapoint_callback(rnd_x_values[i], rnd_y_values[i], true);
			}
			else {
				neg++;
				
				datapoint_callback(rnd_x_values[i], rnd_y_values[i], false);
			}
		}
		else { // y < 0
			// is this dot in the curve?
			if (rnd_y_values[i] <= 0 && rnd_y_values[i] >= y) {
				pos++;
				
				datapoint_callback(rnd_x_values[i], rnd_y_values[i], true);
			}
			else {
				neg++;
				
				datapoint_callback(rnd_x_values[i], rnd_y_values[i], false);
			}
		}
		
	}
	
	// calulate the percentage of positive and negative samples
	pos /= max;
	neg /= max;
	
	// post the results
	result_callback(pos, neg);
}

// approximate the area of our mathematical function
function approximateArea(width, height, percentage) {
	if (percentage < 0 || percentage > 1)
		return 0;

	return width * height * percentage;
}

// reset the view for a new diagram
function resetMonteCarloMethod() {
	d3.select('#canvas').html('');

	$('#bounds').html('');
	$('#positiv-examples').html('');
	$('#negative-examples').html('');
	$('#approximated-area').html('');
}

// draw one DOT of the monte carlo method
function drawApproximationPoint(x, y, up) {
	svg.append('circle')
		.attr('cx', scale_x(x))
		.attr('cy', scale_y(y))
		.attr('r', 3.0)
		.attr('class', (up) ? 'monte-dot-in' : 'monte-dot-out');
}

// display the result of the monte carlo method
function displayMonteCarloMethodResult(pos, neg) {
	var area = approximateArea(Math.abs(x_max), Math.abs(y_min) + Math.abs(y_max), pos);

	$('#bounds').html('<b>Bounds:</b> x from ' + x_min + ' to ' + x_max + ' and y from' + y_min + ' to ' + y_max);
	$('#positiv-examples').html('<b class="pos">Positive samples</b> (in the curve): ' + pos);
	$('#negative-examples').html('<b class="neg">Negative samples</b> (out of the curve): ' + neg);
	$('#approximated-area').html('<b class="area">Approximated area</b> (in the curve): ' + area);
}