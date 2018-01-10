var jQuery = require('jquery');
var $ = jQuery;
require('jquery-ui-browserify');

require('hammerjs');
require('materialize-css');

$.widget('crowdcurio.TextAnnotator', {

    options: {
        apiClient: undefined,
        config: {}
    },

    _create: function() {
        var that = this;

        // 1. initialize the config
        this.options.config = window.config;

        // 1.5. make sure we have a mode set
        this.options.config.mode = this.options.config.mode || 'static'; // default to static


        // 2. render the base HTML containers
        if(that.options.config.mode === 'static'){
            that._createStaticHTMLContainers();
        } else if(that.options.config.mode === 'workflow'){
            that._createWorkflowHTMLContainers();
        }

        $("#loading_modal").modal({dismissible: false});
        $("#loading_modal").modal('open'); 

        // 3. init the api client
        var apiClient = that._getApiClient();
        apiClient.init({
            user: window.user,
            task: window.task,
            experiment: window.experiment,
            condition: window.condition
        });

        // 4. fetch the next task
        apiClient.getNextTask('required', function(data) {
            if(Object.keys(data).length === 0 && data.constructor === Object){
                // we're done!
                // transition to the next step of the experiment
                incrementExperimentWorkflowIndex(csrftoken, window.user, window.experiment);
            } else {
                apiClient.setData(data['id']);
                
                if(that.options.config.mode === 'static'){
                    that._renderStaticDesign(data);
                } else if(that.options.config.mode === 'workflow'){
                    that._renderWorkflowDesign(data);
                }

                // attach the submit button handlers
                $(".submit-btn").click(function(e){
                    that._submitResponse(e);
                });

                // close the modal
                $("#loading_modal").modal('close'); 
            }
        });
    },

    _getApiClient: function() {
        var that = this;
        return that.options.apiClient;
    },

    _createStaticHTMLContainers: function() {
        var that = this;
        var content = ' \
            <div id="loading_modal" class="modal" style="top: auto; width: 310px !important;"><div class="modal-content modal-trigger" href="#loading_modal" style="height: 110px;"><h5>Loading Task Interface</h5><div class="progress"><div class="indeterminate"></div></div></div></div>\
            <div class="annotation" style="width: 700px; float: left;"> \
                <div class="row"> \
                    <div class="col s12box-container"> \
                        <div class="card"> \
                            <div class="card-content blue-grey darken-1 white-text"> \
                                <p class="classification-content flow-text" style="font-size: 1.2em;"></p> \
                            </div> \
                            <div class="card-action"> \
                                <div class="classification-labels"></div> \
                                <div class="confidence-buttons" style="display: none;"> \
                                    <div class="confidence-question"></div> \
                                    <div class="buttons-container"></div> \
                                </div> \
                            </div> \
                            <div class="annotation-decision card-action">\
                                <button id="static-submit-btn" class="btn submit-btn waves-effect waves-light" name="action">Submit\
                                    <i class="material-icons right">send</i>\
                                </button>\
                            </div>\
                        </div> \
                    </div> \
                </div> \
            </div> \
        ';
        $(that.element).html(content);
    },

    _createWorkflowHTMLContainers: function() {
        var that = this;

        var nodes = ['starter-node', 'no-relation-node', 'indirect-relation-node', 'direct-relation-node', 'readable-relation-node', 'informative-relation-node', 'consistent-relation-node'];

        // 1. render the workflow containers for traversing through decisions
        for(var i=0; i < nodes.length; i++){
            var content = ' \
                <div id="'+nodes[i]+'" class="annotation"> \
                    <div class="row"> \
                        <div class="col s12 m6 box-container"> \
                            <div class="card"> \
                                <div class="card-content blue-grey darken-1 white-text"> \
                                    <p id="'+nodes[i]+'-content"  class="classification-content flow-text" style="font-size: 1.2em;"></p> \
                                </div> \
                                <div class="annotation-decision card-action">\
                                    <button id="'+nodes[i]+'-yes" class="btn next-btn waves-effect waves-light" name="action">Yes\
                                        <i class="fa fa-check" aria-hidden="true"></i>\
                                    </button>\
                                    <button id="'+nodes[i]+'-no" class="btn next-btn waves-effect waves-light" name="action">No\
                                        <i class="fa fa-times" aria-hidden="true"></i>\
                                    </button>\
                                </div>\
                            </div> \
                        </div> \
                    </div> \
                </div> \
            ';
            $(that.element).append(content);
        }

        // 2. render the end-point containers
        var nodes = ['no-relation-node', 'indirect-relation-node','wrong-relation-node', 'incomplete-relation-node', 'misleading-relation-node','correct-relation-node', 'partially-unreadable-relation-node'];

        for(var i=0; i < nodes.length; i++){
            var content = ' \
                <div id="'+nodes[i]+'-endpoint" class="endpoint-node annotation"> \
                    <div class="row"> \
                        <div class="col s12 m6 box-container"> \
                            <div class="card blue-grey darken-1"> \
                                <div class="card-content blue-grey darken-1 white-text"> \
                                    <p id="'+nodes[i]+'-endpoint-content"  class="classification-content flow-text" style="font-size: 1.2em;"></p> \
                                </div> \
                                <div class="annotation-decision card-action">\
                                    <button id="'+nodes[i]+'-submit-btn" class="btn submit-btn waves-effect waves-light" name="action">Submit\
                                        <i class="material-icons right">send</i>\
                                    </button>\
                                </div>\
                            </div> \
                        </div> \
                    </div> \
                </div> \
            ';
            $(that.element).append(content);
        }
        
    },

    _renderStaticDesign: function(data) {

        $("#task-container").css('min-width', '1290px');
        var that = this;
        var numberOfButtonsPerRow, currentRow, buttonColumnClass;
        var submissionButton = $(that.element).find('.submission-button button');
        var content = data.content;
        var textContainer = $(that.element).find('.classification-content');
        textContainer.html(content.text);
        $(that.element).find('.annotation').show();

        // 1. render the labels
        var labels = that.options.config.labels;
        var textContainer = $('.classification-content');
        textContainer.html(content.text);
        numberOfButtonsPerRow = 2;
        if (labels.length == 3) {
            numberOfButtonsPerRow = 3;
        }
        buttonColumnClass = 's' + (12 / numberOfButtonsPerRow);
        var labelsContainer = $('.classification-labels');
        labelsContainer.empty();
        var inactiveButtonClass = 'grey';
        var activeButtonClass = 'teal';
        labels.forEach(function(label, l) {
            if (l % numberOfButtonsPerRow == 0) {
                currentRow = $('<div>').addClass('row').appendTo(labelsContainer);
            }
            var column = $('<div>').addClass('col').addClass(buttonColumnClass);
            var button = $('<button>').addClass('btn').val(label.key).html(label.label);
            column.append(button);
            var definitionButton = $('<button id="'+label.key.replace('_label', '').replace(/_/g, '-')+'-example" class="btn-floating waves-effect waves-light orange definition-button"><i class="fa fa-question" disabled></i></button>');
            definitionButton.click(function(e) {
                $('.example-container').hide();
                $("#"+label.key.replace('_label', '').replace(/_/g, '-')+"-example-container").fadeIn();
                console.log("Trying to show "+label.key.replace('_label', '').replace(/_/g, '-')+"-example-container" );
            });
            column.append(definitionButton);
            currentRow.append(column);
            button.click(function(event) {
                event.preventDefault();
                labelsContainer.find('.btn').removeClass(activeButtonClass).addClass(inactiveButtonClass);
                button.addClass(activeButtonClass).removeClass(inactiveButtonClass);
                annotationHumanReadable = label.label;
                that.current_label = label.label;
            });

            // render the example container images for labels
            var content = ' \
                <div id="'+label.key.replace('_label', '').replace(/_/g, '-')+'-example-container"  class="example-container annotation" style="float: left; margin-top: 500px; width: 500px;"> \
                    <div class="row"> \
                        <div class="col s12 box-container"> \
                            <div class="card"> \
                                <div class="card-content blue-grey darken-1 white-text"> \
                                    <p id="'+label.key.replace('_label', '').replace(/_/g, '-')+'-example-container-content"  class="classification-content flow-text" style="font-size: 1.2em;">'+label.example_text+'</p> \
                                </div> \
                            </div> \
                        </div> \
                    </div> \
                </div> \
            ';
            $(that.element).append(content);
        });
        currentRow = undefined;

        // 2. render the confidence radio buttons
        var confidenceQuestion = that.options.config.confidence_config.question || 'How sure are you?';
        var confidenceLevels = that.options.config.confidence_config.levels || [
            {
                score: 0.0,
                label: 'Not Sure',
            },
            {
                score: 0.5,
                label: 'Quite Sure',
            },
            {
                score: 1.0,
                label: 'Sure',
            },
        ];
        var confidence = undefined;
        $('.confidence-question').html(confidenceQuestion);
        numberOfButtonsPerRow = 2;
        if (confidenceLevels.length == 3) {
            numberOfButtonsPerRow = 3;
        }
        buttonColumnClass = 's' + (12 / numberOfButtonsPerRow);
        var confidenceLevelsContainer = $('.confidence-buttons .buttons-container');
        confidenceLevelsContainer.empty();
        confidenceLevels.forEach(function(level, l) {
            if (l % numberOfButtonsPerRow == 0) {
                currentRow = $('<div>').addClass('row').appendTo(confidenceLevelsContainer);
            }
            var column = $('<div>').addClass('col').addClass(buttonColumnClass);
            if (l % numberOfButtonsPerRow == 0) {
                column.addClass('right-align');
            }
            else if ((l + 1) % numberOfButtonsPerRow == 0) {
                column.addClass('left-align');
            }
            else {
                column.addClass('center-align');
            }
            var buttonId = 'confidence-' + level.score;
            var button = $('<input>').attr('type', 'radio').attr('name', 'confidence').attr('id', buttonId).addClass('with-gap').val(level.score);
            var label = $('<label>').attr('for', buttonId).html(level.label);
            column.append(button);
            column.append(label);
            currentRow.append(column);
            if (confidence == level.score) {
                button.prop('checked', true);
            }
        });
        currentRow = undefined;
    },

    _renderWorkflowDesign: function(data) {
        var that = this;
        
        // 0. add the html for each possible label endpoint
        var labels = that.options.config.labels;
        console.log(labels);
        labels.forEach(function(label, l){
            var ele_node = "#"+label.key.replace('_label', '').replace(/_/g, '-')+'-node-endpoint-content';
            console.log("Label: "+ele_node);
            console.log(label.endpoint_node);
            console.log(l);
            $(ele_node).html(label.endpoint_node);
        });

        var nodes = ['starter-node', 'no-relation-node', 'indirect-relation-node', 'direct-relation-node', 'readable-relation-node', 'informative-relation-node', 'consistent-relation-node'];

        // 1. populate workflow elements
        var workflow = data['content']['workflow'];
        for(var i=0; i < nodes.length; i++){
            console.log("trying to add to #"+nodes[i]+"-content");
            $("#"+nodes[i]+"-content").html(workflow[nodes[i].replace(/-/g, '_')]);
        }

        // attacah button handlers
        that._attachButtonHandlers();

        // show the starter node
        $('#starter-node').show();
    },

    _attachButtonHandlers: function(){
        $(".next-btn").click(function(e){
            // get the current node and the choice
            var index = e.target.id.lastIndexOf('-');
            var cur_node = e.target.id.slice(0, index);
            var choice = e.target.id.split('-')[e.target.id.split('-').length-1]

            switch(cur_node){
                // Starter Node
                case "starter-node":
                    $("#starter-node").hide();
                    if(choice === 'yes'){
                        $("#direct-relation-node").show();
                    } else if(choice === 'no'){
                        $("#no-relation-node").show();
                    }
                    break;
                // No Relation    
                case "no-relation-node": 
                    $("#no-relation-node").hide();
                    if(choice === 'yes'){       
                        $("#indirect-relation-node").show();
                    } else if(choice === 'no'){
                        $("#no-relation-node-endpoint").show();
                    }
                    break;
                // Indirect Relation
                case "indirect-relation-node": 
                    $("#indirect-relation-node").hide();
                    if(choice === 'yes'){
                        $("#indirect-relation-node-endpoint").show();
                    } else if(choice === 'no'){
                        $("#no-relation-node-endpoint").show();
                    }
                    break;
                // Correct Relation
                case "direct-relation-node": 
                    $("#direct-relation-node").hide();
                    if(choice === 'yes'){
                        $("#readable-relation-node").show();
                    } else if(choice === 'no'){
                        $("#wrong-relation-node-endpoint").show();
                    }
                    break;
                case "readable-relation-node": 
                    $("#readable-relation-node").hide();
                    if(choice === 'yes'){
                        $("#informative-relation-node").show();
                    } else if(choice === 'no'){
                        $("#incomplete-relation-node-endpoint").show();
                    }
                    break;
                case "informative-relation-node": 
                    $("#informative-relation-node").hide();
                    if(choice === 'yes'){
                        $("#consistent-relation-node").show();
                    } else if(choice === 'no'){
                        $("#misleading-relation-node-endpoint").show();
                    }
                    break;
                case "consistent-relation-node": 
                    $("#consistent-relation-node").hide();
                    if(choice === 'yes'){
                        $("#partially-unreadable-relation-node-endpoint").show();
                    } else if(choice === 'no'){
                        $("#correct-relation-node-endpoint").show();
                    }
                    break;
            }
        });
    },

    _resetInterface: function(){
        var that = this;
        // 1. clear the html workspace
        $(that.element).empty();

         // 2. render the base HTML containers
         if(that.options.config.mode === 'static'){
            that._createStaticHTMLContainers();
        } else if(that.options.config.mode === 'workflow'){
            that._createWorkflowHTMLContainers();
        }

        // 3. get the next task
        // 4. fetch the next task
        var apiClient = that._getApiClient();
        apiClient.getNextTask('required', function(data) {
            if(Object.keys(data).length === 0 && data.constructor === Object){
                // we're done!
                // transition to the next step of the experiment
                incrementExperimentWorkflowIndex(csrftoken, window.user, window.experiment);
            } else {
                apiClient.setData(data['id']);
                if(that.options.config.mode === 'static'){
                    that._renderStaticDesign(data);
                } else if(that.options.config.mode === 'workflow'){
                    that._renderWorkflowDesign(data);
                }

                // attach the submit button handlers
                $(".submit-btn").click(function(e){
                    that._submitResponse(e);
                });
            }
        });

    }, 

    _submitResponse: function(e){
        var that = this;        
        var label = e.target.id.replace('-submit-btn', '').replace('-node', '').replace('_label', '').replace('_', '-');

        // if label is static, it means we aren't using the workflow design
        if(label === 'static'){
            label = that.current_label;
            if(label === undefined){
                alert('Error: You must select a label before submitting.');
                return;
            }
        }

        // save a response through the api client
        console.log("Submitting label response: " + label);
        var apiClient = that._getApiClient();
        apiClient.create('response', {
                content: {'label': label}
            }, function(result){
                that._resetInterface();
        });
    }
});
