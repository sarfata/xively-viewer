$( document ).ready(function() {
  $('#new-feed').click(function(event) {
    var key = $('#key').val();
    var feed = $('#feed').val();
    if (key == '' || feed == '') {
      $('#new-feed-alert').show();
    }
    else {
      addNewFeed(key, feed);
    }
    return false;
  });
});

/*
 * Coordinate getting the feed information, fetching the datastreams, displaying the graph.
 */
function addNewFeed(key, feed) {
  var element = $('#graph-sample').clone().appendTo('#graph-container');
  element.show();
  
  var start = moment().subtract('days', 3);
  var end = moment();
  
  xively.setKey( key );  
  
  xively.feed.get(feed, function(feedInfo) {
    console.log("Feed info", feedInfo);
    var start = moment(feedInfo.created);
    var end = moment();
    
    $(element).find('.title').html(feedInfo.title);
    $(element).find('.description').html(feedInfo.description);
    
    var history = { 
      "start": start.format(),
      "end": end.format(),
      limit: 1000
    };
    var interval = getBestInterval(start, end);
    if (interval != 0) {
      history['interval'] = interval;
      history['interval_type'] = 'discrete';
    }
    
    _.each(feedInfo.datastreams, function(ds) {
      xively.datapoint.history(feed, ds.id, history, function(dsData) {
        addNewGraph(feed, datastream, xivelyToRickshawPoints(dsData));
      });
    });
  });
}

/* Returns the best interval to graph the specified date range 
 * or undefined if the range is too large. 
 */
function getBestInterval(start, end) {
  var hours = end.diff(start, 'hours');
  
  // https://xively.com/dev/docs/api/quick_reference/historical_data/
  var intervals = [
    {value:     0, max: 6},
    {value:    30, max: 12},
    {value:    60, max: 24},
    {value:   300, max: 5*24},
    {value:   900, max: 14*24},
    {value:  1800, max: 31*24},
    {value:  3600, max: 31*24},
    {value: 10800, max: 90*24},
    {value: 21600, max: 180*24},
    {value: 43200, max: 366*24},
    {value: 86400, max: 366*24}    
  ];
  var usableIntervals = _.filter(intervals, function(interval) { return hours <= interval.max; });
  return usableIntervals[0].value;
}

function xivelyToRickshawPoints(data) { 
  var points = _.map(data, function(point) {
    var m = moment(point.at)
    return {
      x: moment(point.at).unix(),
      y: parseFloat(point.value) 
    };
  });
  //console.log("Data has %s points from %s to %s", data.length, data[0].at, data[data.length - 1].at);
  return points;
} 

function addNewGraph(container, datastreams) {
  console.log('draw chart - container=%j data=%j', container, datastreams);
  
  var series = [];
  var colorsFixture = new Rickshaw.Fixtures.Color();
  var colorPalette = colorsFixture.schemes.munin;
  var scales = {};
  _.each(_.keys(datastreams), function (dsId, idx) {
    var values = _.pluck(datastreams[dsId], 'y');
    var min = _.min(values);
    var max = _.max(values);
    
    scales[dsId] = d3.scale.linear().domain([min, max]).nice();
    //console.log('Datastream %s - Min=%s Max=%s', dsId, min, max);
    
    series.push({
      name: dsId,
      color: colorPalette[idx],
      data: datastreams[dsId],
      scale: scales[dsId]
    });
  });
  
  var graph = new Rickshaw.Graph({
    element: $( container ).find('.chart-container').get(0),
    renderer: 'line',
    series: series
  });

  var hoverDetail = new Rickshaw.Graph.HoverDetail( {
      graph: graph
  } );
  
  var legend = new Rickshaw.Graph.Legend({
      graph: graph,
      element: $( container ).find('.legend-container').get(0)
  });
  
  var xAxis = new Rickshaw.Graph.Axis.Time({
      graph: graph
  });
  xAxis.render();

  _.each(_.keys(datastreams), function(dsId) {
    var yAxis = new Rickshaw.Graph.Axis.Y.Scaled({
        graph: graph,
        scale: scales[dsId]
    });
    yAxis.render();
  });

  graph.render();
  
  container.find('.loader').hide();
}


/* Some sample data is always useful to demonstrate the product */
$(document).ready(function() {
  $('.sample-data').click(function(event) {
    $('#key').val(event.currentTarget.attributes['data-key'].value);
    $('#feed').val(event.currentTarget.attributes['data-feed'].value);
  });
});
