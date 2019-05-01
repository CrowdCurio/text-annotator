//  file:   main.js
//  author: Mike Schaekermann
//  desc:   root file for bundling the time series annotator
var CrowdCurioClient = require('crowdcurio-client');
require('./text-annotator');

global.csrftoken = $("[name='csrfmiddlewaretoken']").val();

// set UI vars
var DEV = window.DEV;
var task = window.task || -1;
var user = window.user || -1;
var hit_id = window.hit_id || "-1";
var experiment = window.experiment || -1;
var condition = window.condition|| -1;
var containerId = window.container || 'task-container';
containerElement = $('#' + containerId);

var apiClient = new CrowdCurioClient();
var config = {
    apiClient: apiClient,
};

containerElement.TextAnnotator(config);
annotator = containerElement.data('crowdcurio-TextAnnotator');