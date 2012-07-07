var canvas;
var canvas_margin = { top: 10, right: 10, bottom: 10, left: 60 },
	canvas_width = 700 - canvas_margin.left - canvas_margin.right,
	canvas_height = 600 - canvas_margin.top - canvas_margin.bottom;

var bound_x_min, bound_x_max, bound_y_min, bound_y_max;

var diagram_scale_x, diagram_scale_y;

// initialize the UI and everything else that is needed
function setup() {
	// react on value changes of the samples select
	$('#function_samples').change(function() {
		$('#function_definition').val($('#function_samples option:selected').text());
	});

	// react on clicks of the execute button
	$('#function_execute').click(function() {
		// reset every aspect of the monte carlo calulation
		reset();
		
		var func = createDrawnFunction();
		
		if (! func)
			return false;

		createDiagram(func);
		
		// fetch the number of dots we have to generate
		var samples_count = parseInt($('#samples_count').val(), 10);
		
		// fetch a own set for the X and Y coordinates of the dots
		var random_x_values = null;
		var random_y_values = null;

		requestRandomNumbers(samples_count, bound_x_min, bound_x_max, $('#use_random_org').is(':checked'), function(values) {
			random_x_values = values;
			
			processMonteCarloMethod(func, random_x_values, random_y_values, drawApproximationPoint, displayResults);
		});

		requestRandomNumbers(samples_count, bound_y_min, bound_y_max, $('#use_random_org').is(':checked'), function(values) {
			random_y_values = values;
			
			processMonteCarloMethod(func, random_x_values, random_y_values, drawApproximationPoint, displayResults);
		});

		// do not submit the form!
		return false;
	});
}

// create the whole diagram
function createDiagram(func) {
	// create the function's x/y coordinates
	var data = [];
	
	for (var i = 0; i < canvas_width; i++) {
		var e = { x: i, y: func(i) };
		
		if (e.y > bound_y_max) {
			bound_y_max = e.y;
		}
		else if (e.y < bound_y_min) {
			bound_y_min = e.y;
		}
		
		data.push(e);
	}

	// create the scales of the diagram
	diagram_scale_x = d3.scale.linear()
		.domain([0, canvas_width])
		.range([0, canvas_width]);

	diagram_scale_y = d3.scale.linear()
		.domain([bound_y_min, bound_y_max])
		.range([canvas_height, 0]);

	// create the canvas for the diagram
	canvas = d3.select('#canvas').append('svg')
		.attr('width', canvas_width + canvas_margin.left + canvas_margin.right)
		.attr('height', canvas_height + canvas_margin.top + canvas_margin.bottom)
		.append('g')
			.attr('transform', 'translate(' + canvas_margin.left + ',' + canvas_margin.top + ')');

	// calculate where the 0-y axis is on the canvas
	var null_axis = 100 / (Math.abs(bound_y_min) + Math.abs(bound_y_max)) * Math.abs(bound_y_max) * (canvas_height / 100.0);

	// add a "shadow" for the function path, this is the area we want to approximate via monte carlo
	var area = d3.svg.area()
		.x(function(d) { return diagram_scale_x(d.x); })
		.y0(null_axis)
		.y1(function(d) { return diagram_scale_y(d.y); });
	canvas.append('clipPath')
		.attr('id', 'clip')
		.append('rect')
			.attr('width', canvas_width)
			.attr('height', canvas_height);
	canvas.append('path')
		.attr('class', 'area')
		.attr('clip-path', 'url(#clip)')
		.attr('d', area(data));

	// add the function path
	var line = d3.svg.line()
		.x(function(d) { return diagram_scale_x(d.x); })
		.y(function(d) { return diagram_scale_y(d.y); });

	canvas.append('path')
		.attr('class', 'line')
		.attr('clip-path', 'url(#clip)')
		.attr('d', line(data));

	// add the x and y axis to the diagram
	var xAxis = d3.svg.axis()
		.scale(diagram_scale_x)
		.ticks(20)
		.orient('bottom');
	canvas.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + null_axis + ')')
		.call(xAxis);

	var yAxis = d3.svg.axis()
		.scale(diagram_scale_y)
		.ticks(20)
		.orient('left');
	canvas.append('g')
		.attr('class', 'y axis')
		.call(yAxis);
}

// create and validate the drawn function
function createDrawnFunction() {
	var function_definition = $('#function_definition').val();

	var func = function(x) {
		var y = 0;
		
		eval('y = ' + function_definition + ';');
		
		return y;
	};
	
	// validate the function
	try {
		eval(func(1)); 
	}
	catch (e) {
		// this function is not valid JavaScript code so alert the user and exit the function
		alert(e);
		
		return null;
	}
	
	return func;
}

// display the result of the monte carlo method
function displayResults(pos, neg, area) {
	$('#results')
		.append('<p><b>Bounds:</b> x from ' + bound_x_min + ' to ' + bound_x_max + ' and y from ' + bound_y_min + ' to ' + bound_y_max + '</p>')
		.append('<p><b class="positive">Positive samples</b> (in the curve): ' + (pos * 100.0) + '%</p>')
		.append('<p><b class="negative">Negative samples</b> (out of the curve): ' + (neg * 100.0) + '%</p>')
		.append('<p><b class="area">Approximated area</b> (in the curve): ' + area + '</p>');
}

// draw one dot of the monte carlo method
function drawApproximationPoint(x, y, dot_in) {
	canvas.append('circle')
		.attr('cx', diagram_scale_x(x))
		.attr('cy', diagram_scale_y(y))
		.attr('r', 3.0)
		.attr('class', (dot_in) ? 'dot-in' : 'dot-out')
		.attr('title', x + ', ' + y);
}

// fetch random numbers and execute the callback function if possible
function requestRandomNumbers(number_count, normalize_min, normalize_max, use_random_org, callback) {
	var normalize_range = (normalize_max - normalize_min);

	// Use random.org random numbers
	if (use_random_org) {
		var max = 1000000000;
	
		$.ajax({
			url: 'http://www.random.org/integers/?num=' + number_count + '&min=' + 0 + '&max=' + max + '&col=1&base=10&format=plain&rnd=new',
			cache: false,
			error: function(jqXHR, textStatus, errorThrown) {
				alert('Request to random.org failed. Maybe you reached the request limit of random.org? The error message is: ' + errorThrown);
			}
		}).done(function (data) {
			var data = data.split("\n");
			var numbers = [];

			for (var i = 0; i < data.length; i++) {
				// map the random number to the value range
				var n = parseInt(data[i], 10) / max;
				n = n * normalize_range + normalize_min;
				
				numbers.push(n);
			}
			
			callback(numbers);
		});
	}
	// use JavaScript random numbers
	else {
		var numbers = [];
		
		for (var i = 0; i < number_count; i++) {
			// map the random number to the value range
			numbers.push(Math.random() * normalize_range + normalize_min);
		}
		
		callback(numbers);
	}
}

// execute the monte carlo method
function processMonteCarloMethod(func, random_x_values, random_y_values, datapoint_callback, result_callback) {
	// check if the coordination data is already there
	if (random_x_values == null || random_y_values == null)
		return;
	
	//counter for positive/negative examples
	var positive = 0;
	var negative = 0;
	
	// go through every x-y-coordination data
	var sample_count = Math.min(random_x_values.length, random_y_values.length);
	
	for (var i = 0; i < sample_count; i++) {
		// calculate the y function value of the x coordinate
		var y = func(random_x_values[i]);
		
		// check if this dot is in positive area
		if (y >= 0) { // y >= 0
			// is this dot in the curve?
			if (random_y_values[i] >= 0 && random_y_values[i] <= y) {
				positive++;
				
				datapoint_callback(random_x_values[i], random_y_values[i], true);
			}
			else {
				negative++;
				
				datapoint_callback(random_x_values[i], random_y_values[i], false);
			}
		}
		else { // y < 0
			// is this dot in the curve?
			if (random_y_values[i] <= 0 && random_y_values[i] >= y) {
				positive++;
				
				datapoint_callback(random_x_values[i], random_y_values[i], true);
			}
			else {
				negative++;
				
				datapoint_callback(random_x_values[i], random_y_values[i], false);
			}
		}
		
	}
	
	// calulate the percentage of positive and negative samples
	positive /= sample_count;
	negative /= sample_count;
	
	// approximate the area of the drawn function
	area = (positive < 0 || positive > 1)
		?
			0 
		: 
			Math.abs(bound_x_max) * (Math.abs(bound_y_min) + Math.abs(bound_y_max)) * positive;
	
	// post the results
	result_callback(positive, negative, area);
}

// reset every aspect of the monte carlo calulation for a new diagram
function reset() {
	// reset the function bounds
	bound_x_min = 0;
	bound_x_max = canvas_width - 1;
	bound_y_min = 0.0;
	bound_y_max = 0.0;

	// reset the view
	$('#canvas').html('');
	$('#results').html('');
}
