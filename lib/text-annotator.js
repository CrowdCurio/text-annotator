var jQuery = require('jquery');
var $ = jQuery;
require('jquery-ui-browserify');

require('hammerjs');
require('materialize-css');
require('sweetalert');
var d3 = require("d3");

$.widget('crowdcurio.TextAnnotator', {

    options: {
        apiClient: undefined,
        config: {}
    },

    _create: function() {
        var that = this;
        annotator = this;
        this.instanceId = 'none';
        that.logicPath = [];
        that.justification = "";

        // load up known data
        this.data = {
            1: {
                'e1': 'Constitution',
                'e2': 'the Supreme Leader',
                'relation' : 'Constitution',
                'sentence' : ' The Constitution defines the President as the highest state authority after the Supreme Leader .'
            },
            3: {
                'e1': "Montreal",
                'e2': "international association events",
                'relation': " Montreal was named North America's leading host city for international association events",
                'sentence': " In 2009 , Montreal was named North America's leading host city for international association events , according to the 2009 preliminary rankings of the International Congress and Convention Association ( ICCA ) ."
            },
            9: {
                'e1': "revolution",
                'e2': "sharia",
                'relation': " revolution did not dismantle Pahlavi judiciary it replaced secular-trained jurists and codified more features of the sharia",
                'sentence': " While the revolution did not dismantle the Pahlavi judiciary in its entirety , it replaced secular-trained jurists with seminary-educated ones , and codified more features of the sharia the into state laws - especially the Law of Retribution ."
            },
            16: {
                'e1': "Parliaments",
                'e2': "lower chamber",
                'relation': "The Act of Union 1840 merged the two Colonies by abolishing the Parliaments of Upper and Lower Canada and replacing them with two houses , a Legislative Council as the upper chamber and the Legislative Assembly as the lower chamber .",
                'sentence': "The Act of Union 1840 merged the two Colonies by abolishing the Parliaments of Upper and Lower Canada and replacing them with a single one with two houses , a Legislative Council as the upper chamber and the Legislative Assembly as the lower chamber ."
            },
            35: {
                'e1': "first settlement",
                'e2': "foundation",
                'relation': " first settlement was abandoned one after its foundation",
                'sentence': " This first settlement was abandoned less than one year after its foundation , in the summer 1542 , due in large part to the hostility of the natives the combined with the harsh living conditions during winter ."
            }, 
            36: {
                'e1': "Guardian Council",
                'e2': "President",
                'relation': " Guardian Council is charged with approving the Assembly of Experts and the President",
                'sentence': " Guardian Council is charged with interpreting the Constitution of Iran , supervising elections of candidates , and approving of candidates to , the Assembly of Experts , the President and the Majlis , and ensuring the compatibility of the legislation passed by the Islamic Consultative Assembly with the criteria of Islam and the Constitution ."
            }, 
            47: {
                'e1': "British Canada",
                'e2': "American Revolution",
                'relation': "The Province of Upper Canada was a part of British Canada by the United Kingdom to accommodate Loyalist refugees of the United States of America after the American Revolution .",
                'sentence': "The Province of Upper Canada was a part of British Canada established in 1791 by the United Kingdom to govern the central third of the lands in British North America and to accommodate Loyalist refugees of the United States of America after the American Revolution ."
            },
            58: {
                'e1': "mayor",
                'e2': "Lord Mayor",
                'relation': " mayor of Town shall be known as the Lord Mayor",
                'sentence': " The mayor of the Town of Niagara-on-the-Lake shall be known as the Lord Mayor ."
            },
            101: {
                'e1': "Upper Canada",
                'e2': "1791",
                'relation': " Upper Canada existed 1791 generally",
                'sentence': " Upper Canada existed from 26 December 1791 to 10 February 1841 and generally comprised present-day Southern Ontario ."
            }, 
            109: {
                'e1': "the War of 1812",
                'e2': "1813",
                'relation': " during the War of 1812 the house was used therefore it survived Burning 1813",
                'sentence': " During the War of 1812 the house was used as both a hospital and Officer's Quarters , therefore it survived the Burning on Newark in December 1813 ."
            }
        };

        // 1. initialize the config
        this.options.config = window.config;


        // 1.5. make sure we have a mode set
        this.options.config.mode = this.options.config.mode || 'static'; // default to static
        this.options.config.lab_study = this.options.config.lab_study || false; //
        this.options.config.total_tasks = 20; //
        this.options.config.total_tasks_practice = this.options.config.total_tasks_practice || 3;

        this.state = 'practice';

        // 2. render the base HTML containers
        if(that.options.config.mode === 'static'){
            that._createStaticHTMLContainers();
        } else if(that.options.config.mode === 'workflow'){
            that._createWorkflowHTMLContainers();
        } else if(that.options.config.mode === 'hybrid'){
            that._createHybridHTMLContainers();
        }

        $("#loading_modal").modal({dismissible: false});
        $("#loading_modal").modal('open'); 

        // 3. init the api client
        var apiClient = that._getApiClient();
        apiClient.init({
            user: window.user,
            task: window.task,
            experiment: window.experiment,
            condition: window.condition,
            configuration: this.options.config,
        });

        // 3.5 fetch practice tasks 
        apiClient.getNextTask('practice', function(data) {
            if(Object.keys(data).length === 0 && data.constructor === Object){
                // we're done with practice
                // 4. fetch the next required task
                that.state = 'required';
                that._fetchRequiredTasks();
            } else {
                console.log('Practice Tasks:');
                apiClient.setData(data['id']);
                that.instanceId = 'practice-'+data['name'].split('-')[0];
                that.instanceData = data;
                
                if(that.options.config.mode === 'static'){
                    that._renderStaticDesign(data);
                } else if(that.options.config.mode === 'workflow'){
                    that._renderWorkflowDesign(data);
                } else if(that.options.config.mode === 'hybrid'){
                    that._renderHybridDesign(data);
                }

                var completed_tasks;
                if(that.state === 'required'){
                    completed_tasks = that.options.config.total_tasks - apiClient.router.queues['required']['total']+1;
                } else {
                    completed_tasks = that.options.config.total_tasks_practice - apiClient.router.queues['practice']['total']+1;
                }
                var ele = $(".preloader-wrapper");
                ele.remove();
                var ele = $("#progress-bar-text");
                if(that.state === 'required'){
                    ele.text("Task Progress: " + completed_tasks.toString() + " / " + that.options.config.total_tasks);
                } else {
                    ele.text("Practice Task Progress: " + completed_tasks.toString() + " / " + that.options.config.total_tasks_practice);
                }

                // attach the submit button handlers
                $(".submit-btn").click(function(e){
                    that._submitResponse(e);
                });

                // close the modal
                $("#loading_modal").modal('close'); 

                setTimeout(function(){
                    console.log('trying to open modal');
                    // close the modal
                    $("#training_modal").modal({dismissible: true});
                    $("#training_modal").modal('open'); 

                    $("#training-modal-ok-btn").click(function(){
                        $("#training_modal").modal('close'); 
                    })
                }, 1000);
            }
        });
    },

    _fetchRequiredTasks: function(){
        var that = this;
        var apiClient = that._getApiClient();
        
        // 4. fetch the next task
        apiClient.getNextTask('required', function(data) {
            if(Object.keys(data).length === 0 && data.constructor === Object){
                // we're done!
                // transition to the next step of the experiment
                if(that.options.config.lab_study){
                    that.state = 'reviewing';
                    swal("Phase I completed! Let's take a moment to see how you've done!");
                    that._parseLabelHistory();
                } else {
                    incrementExperimentWorkflowIndex(csrftoken, window.user, window.experiment);
                }
            } else {
                apiClient.setData(data['id']);
                that.instanceId = data['name'].split('-')[0];
                that.instanceData = data;
                
                if(that.options.config.mode === 'static'){
                    that._renderStaticDesign(data);
                } else if(that.options.config.mode === 'workflow'){
                    that._renderWorkflowDesign(data);
                } else if(that.options.config.mode === 'hybrid'){
                    that._renderHybridDesign(data);
                }

                var completed_tasks = that.options.config.total_tasks - apiClient.router.queues['required']['total']+1;
                var ele = $(".preloader-wrapper");
                ele.remove();
                var ele = $("#progress-bar-text");
                ele.text("Task Progress: " + completed_tasks.toString() + " / " + that.options.config.total_tasks);

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
        <div id="training_modal" class="modal" style="top: auto; height: 200px;width: 510px !important;"><div class="modal-content" href="#training_modal" style="height: 110px;"><h5>Try it Out</h5><hr/><div>Before you begin, we\'re going to let you try a few practice tasks to get the hang of things. Don\'t worry -- these won\'t count against you.</div><hr/><div style="text-align: center;"><a id="training-modal-ok-btn" href="#!" class="waves-green btn-flat" style="text-align: center;">OK - Got it!</a></div></div></div>\
        <div id="loading_modal" class="modal" style="top: auto; width: 310px !important;"><div class="modal-content modal-trigger" href="#loading_modal" style="height: 110px;"><h5>Loading Task Interface</h5><div class="progress"><div class="indeterminate"></div></div></div></div>\
            <div class="progress_bar" style="width: 700px; float: left; text-align: center;"> \
                <div class="row"> \
                    <div class="col s12 box-container"> \
                        <div class="card"> \
                            <div class="card-content blue-grey darken-4 white-text"> \
                            <strong><p id="progress-bar-text" class="progress-bar-text flow-text" style="font-size: 1.2em;text-align:center;font-weight: 600;">\
                            <div class="preloader-wrapper small active">\
                                <div class="spinner-layer spinner-green-only">\
                                <div class="circle-clipper left">\
                                    <div class="circle"></div>\
                                </div><div class="gap-patch">\
                                    <div class="circle"></div>\
                                </div><div class="circle-clipper right">\
                                    <div class="circle"></div>\
                                </div>\
                                </div>\
                            </div></p></strong> \
                            </div> \
                        </div> \
                    </div> \
                </div> \
            </div> \
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
        
        var content = ' \
        <div id="training_modal" class="modal" style="top: auto; height: 200px;width: 510px !important;"><div class="modal-content" href="#training_modal" style="height: 110px;"><h5>Try it Out</h5><hr/><div>Before you begin, we\'re going to let you try a few practice tasks to get the hang of things. Don\'t worry -- these won\'t count against you.</div><hr/><div style="text-align: center;"><a id="training-modal-ok-btn" href="#!" class="waves-green btn-flat" style="text-align: center;">OK - Got it!</a></div></div></div>\
        <div id="loading_modal" class="modal" style="top: auto; width: 310px !important;"><div class="modal-content modal-trigger" href="#loading_modal" style="height: 110px;"><h5>Loading Task Interface</h5><div class="progress"><div class="indeterminate"></div></div></div></div>\
        <div class="progress_bar" style="width: 700px; float: left; text-align: center;"> \
        <div class="row"> \
            <div class="col s12 box-container"> \
                <div class="card"> \
                    <div class="card-content blue-grey darken-4 white-text"> \
                    <strong><p id="progress-bar-text" class="progress-bar-text flow-text" style="font-size: 1.2em;text-align:center;font-weight: 600;">\
                    <div class="preloader-wrapper small active">\
                        <div class="spinner-layer spinner-green-only">\
                        <div class="circle-clipper left">\
                            <div class="circle"></div>\
                        </div><div class="gap-patch">\
                            <div class="circle"></div>\
                        </div><div class="circle-clipper right">\
                            <div class="circle"></div>\
                        </div>\
                        </div>\
                    </div></p></strong> \
                    </div> \
                </div> \
            </div> \
        </div> \
    </div>';
    $(that.element).html(content);

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
                                <p>\
                                  <label>\
                                    <input id="submit-radio-1" class="with-gap" name="group1" type="radio"  />\
                                    <span>Sounds right!</span>\
                                  </label>\
                                </p>\
                                <p>\
                                  <label>\
                                    <input id="submit-radio-2" class="with-gap" name="group1" type="radio"  />\
                                    <span>This doesn\'t sound right!</span>\
                                  </label>\
                                </p>\
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

    _createHybridHTMLContainers: function(){
        var that = this;
        
        var content = ' \
        <div id="training_modal" class="modal" style="top: auto; height: 200px;width: 510px !important;"><div class="modal-content" href="#training_modal" style="height: 110px;"><h5>Try it Out</h5><hr/><div>Before you begin, we\'re going to let you try a few practice tasks to get the hang of things. Don\'t worry -- these won\'t count against you.</div><hr/><div style="text-align: center;"><a id="training-modal-ok-btn" href="#!" class="waves-green btn-flat" style="text-align: center;">OK - Got it!</a></div></div></div>\
        <div id="loading_modal" class="modal" style="top: auto; width: 310px !important;"><div class="modal-content modal-trigger" href="#loading_modal" style="height: 110px;"><h5>Loading Task Interface</h5><div class="progress"><div class="indeterminate"></div></div></div></div>\
        <div class="progress_bar" style="width: 700px; float: left; text-align: center;"> \
        <div class="row"> \
            <div class="col s12 box-container"> \
                <div class="card"> \
                    <div class="card-content blue-grey darken-4 white-text"> \
                    <strong><p id="progress-bar-text" class="progress-bar-text flow-text" style="font-size: 1.2em;text-align:center;font-weight: 600;">\
                    <div class="preloader-wrapper small active">\
                        <div class="spinner-layer spinner-green-only">\
                        <div class="circle-clipper left">\
                            <div class="circle"></div>\
                        </div><div class="gap-patch">\
                            <div class="circle"></div>\
                        </div><div class="circle-clipper right">\
                            <div class="circle"></div>\
                        </div>\
                        </div>\
                    </div></p></strong> \
                    </div> \
                </div> \
            </div> \
        </div> \
    </div>';
    $(that.element).html(content);

        var nodes = ['starter-node', 'no-relation-node', 'indirect-relation-node', 'direct-relation-node', 'readable-relation-node', 'informative-relation-node-a', 'informative-relation-node-b', 'missing-information-node-a', 'missing-information-node-b', 'consistency-check-node-a', 'consistency-check-node-b'];

        // 1. render the workflow containers for traversing through decisions
        for(var i=0; i < nodes.length; i++){
            var content;

            if(nodes[i] === 'starter-node'){
                content = ' \
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
            }
            else if(nodes[i] === 'missing-information-node-a' || nodes[i] === 'missing-information-node-b'){
                content = ' \
                <div id="'+nodes[i]+'" class="annotation" style="width: 700px; float: left;"> \
                    <div class="row"> \
                        <div class="col box-container"> \
                            <div class="card"> \
                                <div class="card-content blue-grey darken-1 white-text"> \
                                    <p id="'+nodes[i]+'-content"  class="missing-information-classification-content classification-content flow-text" style="font-size: 1.2em;"></p> \
                                </div> \
                                <div class="card-action"> \
                                    <div class="missing-information-classification-labels classification-labels"></div> \
                                    <div class="confidence-buttons" style="display: none;"> \
                                        <div class="confidence-question"></div> \
                                        <div class="missing-information-buttons-container"></div> \
                                    </div> \
                                </div> \
                                <div class="annotation-decision card-action">\
                                    <button id="'+nodes[i]+'-next-btn" class="btn next-btn waves-effect waves-light" name="action">Next\
                                        <i class="material-icons right">send</i>\
                                    </button>\
                                </div>\
                            </div> \
                        </div> \
                    </div> \
                </div> \
            ';
            } else if(nodes[i] === 'consistency-check-node-a' || nodes[i] === 'consistency-check-node-b'){
                content = ' \
                <div id="'+nodes[i]+'" class="annotation" style="width: 700px; float: left;"> \
                    <div class="row"> \
                        <div class="col box-container"> \
                            <div class="card"> \
                                <div class="card-content blue-grey darken-1 white-text"> \
                                    <p id="'+nodes[i]+'-content"  class="consistency-check-classification-content classification-content flow-text" style="font-size: 1.2em;"></p> \
                                </div> \
                                <div class="card-action"> \
                                    <div class="consistency-check-classification-labels classification-labels"></div> \
                                    <div class="confidence-buttons" style="display: none;"> \
                                        <div class="confidence-question"></div> \
                                        <div class="consistency-check-buttons-container buttons-container"></div> \
                                    </div> \
                                </div> \
                                <div class="annotation-decision card-action">\
                                    <button id="'+nodes[i]+'-next-btn" class="btn next-btn waves-effect waves-light" name="action">Next\
                                        <i class="material-icons right">send</i>\
                                    </button>\
                                </div>\
                            </div> \
                        </div> \
                    </div> \
                </div> \
            ';
            } else if(nodes[i] === 'readable-relation-node'){
                content = ' \
                <div id="'+nodes[i]+'" class="annotation"> \
                    <div class="row"> \
                        <div class="col s12 m6 box-container"> \
                            <div class="card"> \
                                <div class="card-content blue-grey darken-1 white-text"> \
                                    <p id="'+nodes[i]+'-content"  class="classification-content flow-text" style="font-size: 1.2em;"></p> \
                                </div> \
                                <div class="annotation-decision card-action">\
                                    <button id="'+nodes[i]+'-major" class="btn next-btn waves-effect waves-light" name="action">Major\
                                    </button>\
                                    <button id="'+nodes[i]+'-minor" class="btn next-btn waves-effect waves-light" name="action">Minor\
                                    </button>\
                                </div>\
                            </div> \
                        </div> \
                    </div> \
                </div> \
            ';
            } else {
            content = ' \
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
            }
            $(that.element).append(content);

            var labels = [];
            var textContainerClass;
            var labelsContainerClass
            var classType;
            // add in content for the multiple-choice for hybrid
            if(nodes[i] === 'missing-information-node-a' || nodes[i] === 'missing-information-node-b'){
                labels = ['incomplete relation', 'misleading relation', 'clear relation'];
                textContainerClass = '.missing-information-classification-content';
                labelsContainerClass = '.missing-information-classification-labels';
                classType = 'missing-information';

            } else if (nodes[i] === 'consistency-check-node-a' || nodes[i] === 'consistency-check-node-b'){
                labels = ['misleading relation', 'clear relation'];
                textContainerClass = '.consistency-check-classification-content';
                labelsContainerClass = '.consistency-check-classification-labels';
                classType = 'consistency-check';
            }

            if(labels.length > 0){
                // 1. render the labels
                var textContainer = $(textContainerClass);
                textContainer.html(content.text);
                numberOfButtonsPerRow = 2;
                if (labels.length == 3) {
                    numberOfButtonsPerRow = 3;
                }
                buttonColumnClass = 's' + (12 / numberOfButtonsPerRow);
                var labelsContainer = $(labelsContainerClass);
                labelsContainer.empty();
                var inactiveButtonClass = 'grey';
                var activeButtonClass = 'teal';
                labels.forEach(function(label, l) {
                    if (l % numberOfButtonsPerRow == 0) {
                        currentRow = $('<div>').addClass('row').appendTo(labelsContainer);
                    }
                    var column = $('<div>').addClass('col').addClass(buttonColumnClass);
                    var button = $('<button>').addClass('btn').addClass('multiple-choice-btn').val(label.replace(' ', '-')).html(label).attr('id', classType+'-'+label.replace(' ', '-')+'-btn');
                    column.append(button);
                    var definitionButton = $('<button id="'+classType+'-'+label.replace(' ', '-')+'-example" class="btn-floating waves-effect waves-light orange definition-button"><i class="fa fa-question" disabled></i></button>');


var exampleContent = {
                        'misleading relation' : '<div style="display: table-cell; width: 50%; background-color: #990000; color: black; padding: 20px;"><h3><b>Misleading Relation Label</b></h3> <hr><p>Based on the reference sentence, these entities <b>E1</b> and <b>E2</b> are directly related. That is, it\'s possible to write an independent clause  such that :<br><br></p><ol type="1"><li>the clause contains <b>E1</b> and <b>E2</b></li><li><b>E1</b> and <b>E2</b> appear in the same order as in <b>S</b></li><li><u>no external knowledge</u> is used to write this independent clause</li></ol><br>Also:<br><ol type="1"><li>While the relation label <b>RL</b> is readable, and looks like a valid relationship, once the reference sentence <b>S</b> is consulted it becomes evident that the label is misleading and not consistent with what is expressed by <b>S</b>.</li><li>It is often the case that critical parts of the relation label <b>RL</b> is missing or the actual relationship holds between other entities in that sentence and not between <b>E1</b> and <b>E2</b>.</li></ol><br><br>in the following examples, the <b style="color:white;">[white highlighted words]</b> are missing from the generated label:<br><br><div class="example">Constitution defines <b>[E1 President]</b> as the highest <b>[E2 state authority]</b> <b style="color:white;">[after the Supreme Leader]</b></div><br><div class="example"><b style="color:white;">[After being elected]</b> <b>[E1 president]</b> must be appointed by the <b>[E2 Supreme Leader]</b></div><br><p></p></div>',

                        'incomplete relation': '<div style="display: table-cell; background-color: #DA007F; color: black; padding: 20px;"><h3><b>Incomplete Relation Label</b></h3><hr><p>Based on the reference sentence, these entities <b>E1</b> and <b>E2</b> are directly related. That is, it\'s possible to write an independent clause  such that :<br><br></p><ol type="1"><li>the clause contains <b>E1</b> and <b>E2</b></li><li><b>E1</b> and <b>E2</b> appear in the same order as in <b>S</b></li><li><u>no external knowledge</u> is used to write this independent clause</li></ol><br>Also:<br><ol type="1"><li>The relation label <b>RL</b> is readable.</li><li>Critical parts of the relation label <b>RL</b> is missing.</li><li>As a result, by reading the label <b>RL</b> alone it is not possilbe to fully understand the relation between <b>E1</b> and <b>E2</b>.</li></ol><br><br>in the following examples, the <b style="color:white;">[white highlighted words]</b> are missing from the generated label:<br><br><div class="example"><b>[E1 mayor]</b> of Town <b style="color:white;">[of Niagara-on-the-Lake]</b> shall be known as the <b>[E2 Lord Mayor]</b></div><br><div class="example"><b>[E1 Constitution]</b> defines President <b style="color:white;">[as the highest state authority]</b> after the <b>[E2 Supreme Leader]</b></div><br><p></p></div>',

                        'clear relation' : '<div style="display: table-cell; background-color: green; color: black; padding: 20px;"><h3><b>Correct Relation Label</b></h3><hr><p>Based on the reference sentence, these entities <b>E1</b> and <b>E2</b> are directly related. That is, it\'s possible to write an independent clause  such that :<br><br></p><ol type="1"><li>the clause contains <b>E1</b> and <b>E2</b></li><li><b>E1</b> and <b>E2</b> appear in the same order as in <b>S</b></li><li><u>no external knowledge</u> is used to write this independent clause</li></ol><br>Also:<br><ol type="1"><li>The generated relation label <b>RL</b> is accurate and descriptive.</li></ol><br><p></p></div>',
                    }

                    // render the example container images for labels
                    var content = ' \
                        <div id="'+classType+'-'+label.replace(' ', '-')+'-example-container"  class="example-container annotation" style="float: left; margin-top: 500px; width: 500px;"> \
                            <div class="row"> \
                                <div class="col s12 box-container"> \
                                    <div class="card"> \
                                        <div class="card-content blue-grey darken-1 white-text"> \
                                            <p id="'+classType+'-'+label+'-example-container-content"  class="classification-content flow-text" style="font-size: 1.2em;">'+exampleContent[label]+'</p> \
                                        </div> \
                                    </div> \
                                </div> \
                            </div> \
                        </div> \
                    ';
                    $(that.element).append(content);


                    definitionButton.click(function(e) {
                        $('.example-container').hide();
                        var id = e.currentTarget.id;
                        console.log("Showing: #"+id+'-container');
                        $("#"+id+'-container').fadeIn();
                    });
                    column.append(definitionButton);
                    currentRow.append(column);
                    var button = $('#'+classType+'-'+label.replace(' ', '-')+'-btn');
                    button.click(function(event) {
                        console.log("Clicked");
                        event.preventDefault();
                        $('.multiple-choice-btn').removeClass(activeButtonClass).addClass(inactiveButtonClass);

                        button.addClass(activeButtonClass).removeClass(inactiveButtonClass);
                    });
                });
            }
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
                                <div class="annotation-decision card-action">\
                                <form id="sounds-good-form" style="width: 50%;margin: 0 auto;margin-bottom: 15px;color: aliceblue;border: 1px dashed;padding: 8px;"> How does this sound to you? <p> <label> <input id="'+nodes[i]+'-submit-radio-1" class="with-gap" name="group1" type="radio" style=" opacity: 1; position: relative; "> <span style=" color: white; ">Sounds right!</span> </label> </p> <p> <label> <input id="'+nodes[i]+'-submit-radio-2" class="with-gap" name="group1" type="radio" style=" position: relative; opacity: 1; "> <span style=" color: white; ">This doesn\'t sound right!</span> </label> </p> </form>\
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

        $("#task-container").css('width', '1290px');
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
            });
            column.append(definitionButton);
            currentRow.append(column);
            button.click(function(event) {
                event.preventDefault();
                $(".classification-labels").find('.btn').removeClass(activeButtonClass).addClass(inactiveButtonClass);
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
        $("#task-container").css('width', '1290px');
        var that = this;
        
        // 0. add the html for each possible label endpoint
        var labels = that.options.config.labels;
        labels.forEach(function(label, l){
            var ele_node = "#"+label.key.replace('_label', '').replace(/_/g, '-')+'-node-endpoint-content';
            $(ele_node).html(label.endpoint_node);
        });

        var nodes = ['starter-node', 'no-relation-node', 'indirect-relation-node', 'direct-relation-node', 'readable-relation-node', 'informative-relation-node', 'consistent-relation-node'];

        // 1. populate workflow elements
        var workflow = data['content']['workflow'];
        for(var i=0; i < nodes.length; i++){
            $("#"+nodes[i]+"-content").html(workflow[nodes[i].replace(/-/g, '_')]);
        }

        // attacah button handlers
        that._attachButtonHandlers();

        // show the starter node
        $('#starter-node').show();
    },

    _renderHybridDesign: function(data) {
        $("#task-container").css('width', '1290px');
        var that = this;
        
        // 0. add the html for each possible label endpoint
        var labels = that.options.config.labels;
        labels.forEach(function(label, l){
            var ele_node = "#"+label.key.replace('_label', '').replace(/_/g, '-')+'-node-endpoint-content';
            $(ele_node).html(label.endpoint_node);
        });

        var nodes = ['starter-node', 'no-relation-node', 'indirect-relation-node', 'direct-relation-node', 'readable-relation-node', 'informative-relation-node-a', 'informative-relation-node-b',  'missing-information-node-a', 'missing-information-node-b', 'consistency-check-node-a', 'consistency-check-node-b'];

        // 1. populate workflow elements
        var workflow = data['content']['workflow'];
        for(var i=0; i < nodes.length; i++){
            $("#"+nodes[i]+"-content").html(workflow[nodes[i].replace(/-/g, '_')]);
        }

        // attacah button handlers
        that._attachButtonHandlers();

        // show the starter node
        $('#starter-node').show();
    },

    _attachButtonHandlers: function(){
        var that = this;
        $(".next-btn").click(function(e){
            // get the current node and the choice
            var btn = $(this);
            var index = $(this).attr('id').lastIndexOf('-');
            var cur_node = $(this).attr('id').slice(0, index);
            var choice = $(this).attr('id').split('-')[$(this).attr('id').split('-').length-1];
            console.log("CurNode: "+cur_node);
            console.log("Choice: "+choice);
            if(that.state !== 'practice'){
                switch(cur_node){
                    // Starter Node
                    case "starter-node":
                        if(choice === 'yes'){
                            $("#starter-node").hide();
                            $("#direct-relation-node").show();
                        } else if(choice === 'no'){

                            swal("Below, please explain why you are answering with 'No'.", {
                                buttons: ["Cancel", true],
                                content: "input",
                            })
                            .then((value) => {
                                if(value !== null){
                                    that.justification = value;
                                    $("#starter-node").hide();
                                    $("#no-relation-node").show();

                                    // save the choice
                                    that.logicPath.push(choice);

                                    // scroll to the top
                                    $('html, body').animate({
                                        scrollTop: $('#task-container').offset().top - 70 //#DIV_ID is an example. Use the id of your destination on the page
                                    }, 'slow');
                                }
                            });
                            return;
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
                        if(that.state === 'workflow'){
                            if(choice === 'yes'){
                                $("#readable-relation-node").show();
                            } else if(choice === 'no'){
                                $("#wrong-relation-node-endpoint").show();
                            }
                        } else {
                            if(choice === 'yes'){
                                $("#readable-relation-node").show();
                            } else if(choice === 'no'){
                                $("#informative-relation-node-a").show();
                            }
                        }
                        break;
                    case "readable-relation-node": 
                        $("#readable-relation-node").hide();
                        if(choice === 'yes'){
                            $("#informative-relation-node").show();
                        } else if(choice === 'no'){
                            $("#incomplete-relation-node-endpoint").show();
                        } else if(choice === 'major'){
                            $("#wrong-relation-node-endpoint").show();
                        } else if(choice === 'minor'){
                            $("#informative-relation-node-b").show();
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

                    // hyrbid-specific
                    case "informative-relation-node-a": 
                        $("#informative-relation-node-a").hide();
                        if(choice === 'yes'){
                            $("#missing-information-node-a").show();
                        } else if(choice === 'no'){
                            $("#consistency-check-node-a").show();
                        }
                        break;
                    case "informative-relation-node-b": 
                        $("#informative-relation-node-b").hide();
                        if(choice === 'yes'){
                            $("#missing-information-node-b").show();
                        } else if(choice === 'no'){
                            $("#consistency-check-node-b").show();
                        }
                        break;    
                    case "missing-information-node-a-next": 
                        console.log("Length: "+$(".missing-information-btn.teal").length);
                        if($(".multiple-choice-btn.teal").length === 0){
                            swal("You must select a label before clicking next.");
                            return;
                        }

                        choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');

                        $("#missing-information-node-a").hide();
                        if(choice === 'incomplete'){
                            $("#incomplete-relation-node-endpoint").show();
                        } else if(choice === 'misleading'){
                            $("#misleading-relation-node-endpoint").show();
                        } else if(choice === 'clear') {
                            $("#correct-relation-node-endpoint").show();
                        }
                        break;        
                    case "missing-information-node-b-next": 
                        if($(".multiple-choice-btn.teal").length === 0){
                            swal("You must select a label before clicking next.");
                            return;
                        }

                        choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');

                        $("#missing-information-node-b").hide();
                        if(choice === 'incomplete'){
                            $("#incomplete-relation-node-endpoint").show();
                        } else if(choice === 'misleading'){
                            $("#misleading-relation-node-endpoint").show();
                        } else if(choice === 'clear') {
                            $("#partially-unreadable-relation-node-endpoint").show();
                        }
                        break;    
                    case "consistency-check-node-a-next": 
                        if($(".multiple-choice-btn.teal").length === 0){
                            swal("You must select a label before clicking next.");
                            return;
                        }

                        choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');

                        $("#consistency-check-node-a").hide();
                        if(choice === 'clear'){
                            $("#correct-relation-node-endpoint").show();
                        } else if(choice === 'misleading'){
                            $("#misleading-relation-node-endpoint").show();
                        }
                        break; 
                    case "consistency-check-node-b-next": 
                        if($(".multiple-choice-btn.teal").length === 0){
                            swal("You must select a label before clicking next.");
                            return;
                        }

                        choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');

                        $("#consistency-check-node-b").hide();
                        if(choice === 'clear'){
                            $("#partially-unreadable-relation-node-endpoint").show();
                        } else if(choice === 'misleading'){
                            $("#misleading-relation-node-endpoint").show();
                        }
                        break;      
                }

                // save the choicce
                that.logicPath.push(choice);

                // hide example containers
                $('.example-container').fadeOut();

                // scroll to the top
                $('html, body').animate({
                    scrollTop: $('#task-container').offset().top - 70 //#DIV_ID is an example. Use the id of your destination on the page
                }, 'slow');

            } else { /// practice
                if(choice === 'btn'){
                    if($(".multiple-choice-btn.teal").length > 0){
                        choice = $(".multiple-choice-btn.teal").val().replace("-relation", '');
                        cur_node = 'missing-information-node-a';
                    } else {
                        swal("You must select a label before clicking next.");
                        return;
                    }
                }

                console.log("cur_node: ");
                console.log(cur_node);
                console.log("#"+cur_node+"-content");
                console.log("Choice: "+choice);
                console.log("Correct Answer: "+correct_answer);
                var correct_answer = $("#"+cur_node+"-content").children()[0].innerHTML;
                var correct_explanation = $("#"+cur_node+"-content").children()[1].innerHTML;

                // Try and remove any existing toasts that exist
                if($('.toast').length){
                    var toastElement = $('.toast').first()[0];
                    var toastInstance = toastElement.M_Toast;
                    toastInstance.remove();
                }

                if(choice !== correct_answer){
                    Materialize.toast(correct_explanation + "<br/><br/> Try again. That's incorrect. :(", 30000, 'rounded')
                    return;
                } else {
                    Materialize.toast(correct_explanation + "<br/><br/> Good job! That's correct. :D", 30000, 'rounded')
                    switch(cur_node){
                            // Starter Node
                            case "starter-node":
                                // check for justification
                                var ele = $("#starter-justification");
                                if(ele.length > 0){
                                    if (!$.trim(ele.val())) {
                                        swal("Error: You must provide a justification to move forward!");
                                        return;
                                    } else {
                                        that.justification = $.trim(ele.val());
                                    }
                                }
        
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
                                if(that.state === 'workflow'){
                                    if(choice === 'yes'){
                                        $("#readable-relation-node").show();
                                    } else if(choice === 'no'){
                                        $("#wrong-relation-node-endpoint").show();
                                    }
                                } else {
                                    if(choice === 'yes'){
                                        $("#readable-relation-node").show();
                                    } else if(choice === 'no'){
                                        $("#informative-relation-node-a").show();
                                    }
                                }
                                break;
                            case "readable-relation-node": 
                                $("#readable-relation-node").hide();
                                if(choice === 'yes'){
                                    $("#informative-relation-node").show();
                                } else if(choice === 'no'){
                                    $("#incomplete-relation-node-endpoint").show();
                                } else if(choice === 'major'){
                                    $("#wrong-relation-node-endpoint").show();
                                } else if(choice === 'minor'){
                                    $("#informative-relation-node-b").show();
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
        
                            // hyrbid-specific
                            case "informative-relation-node-a": 
                                $("#informative-relation-node-a").hide();
                                if(choice === 'yes'){
                                    $("#missing-information-node-a").show();
                                } else if(choice === 'no'){
                                    $("#correct-relation-node-endpoint").show();
                                }
                                break;
                            case "informative-relation-node-b": 
                                $("#informative-relation-node-b").hide();
                                if(choice === 'yes'){
                                    $("#missing-information-node-b").show();
                                } else if(choice === 'no'){
                                    $("#partially-unreadable-relation-node-endpoint").show();
                                }
                                break;    
                            case "missing-information-node-a": 
                                console.log("Length: "+$(".missing-information-btn.teal").length);
                                if($(".multiple-choice-btn.teal").length === 0){
                                    swal("You must select a label before clicking next.");
                                    return;
                                }
        
                                choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');
        
                                $("#missing-information-node-a").hide();
                                if(choice === 'incomplete'){
                                    $("#incomplete-relation-node-endpoint").show();
                                } else if(choice === 'misleading'){
                                    $("#misleading-relation-node-endpoint").show();
                                } else if(choice === 'clear') {
                                    $("#correct-relation-node-endpoint").show();
                                }
                                break;        
                            case "missing-information-node-b-next": 
                                if($(".multiple-choice-btn.teal").length === 0){
                                    swal("You must select a label before clicking next.");
                                    return;
                                }
        
                                choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');
        
                                $("#missing-information-node-b").hide();
                                if(choice === 'incomplete'){
                                    $("#incomplete-relation-node-endpoint").show();
                                } else if(choice === 'misleading'){
                                    $("#misleading-relation-node-endpoint").show();
                                } else if(choice === 'clear') {
                                    $("#partially-unreadable-relation-node-endpoint").show();
                                }
                                break;    
                            case "consistency-check-node-a-next": 
                                if($(".multiple-choice-btn.teal").length === 0){
                                    swal("You must select a label before clicking next.");
                                    return;
                                }
        
                                choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');
        
                                $("#consistency-check-node-a").hide();
                                if(choice === 'clear'){
                                    $("#correct-relation-node-endpoint").show();
                                } else if(choice === 'misleading'){
                                    $("#misleading-relation-node-endpoint").show();
                                }
                                break; 
                            case "consistency-check-node-b-next": 
                                if($(".multiple-choice-btn.teal").length === 0){
                                    swal("You must select a label before clicking next.");
                                    return;
                                }
        
                                choice = $(".multiple-choice-btn.teal").val().replace('-relation', '');
        
                                $("#consistency-check-node-b").hide();
                                if(choice === 'clear'){
                                    $("#partially-unreadable-relation-node-endpoint").show();
                                } else if(choice === 'misleading'){
                                    $("#misleading-relation-node-endpoint").show();
                                }
                                break;     
                    
                    }

                    // scroll to the top
                    $('html, body').animate({
                        scrollTop: $('#task-container').offset().top - 70 //#DIV_ID is an example. Use the id of your destination on the page
                    }, 'slow');

                }
                
            }
            
        });
    },

    _resetInterface: function(){
        var that = this;

        // 0. record the progress
        var ele = $("#progress-bar-text");
        var completed_tasks;
        if(that.state === 'practice'){
            completed_tasks = parseInt(ele.text().split(' ')[3]) + 1;
        } else {
            completed_tasks = parseInt(ele.text().split(' ')[2]) + 1;
        }

        // 1. clear the html workspace
        $(that.element).empty();
        that.logicPath = [];
        that.justification = "";

         // 2. render the base HTML containers
         if(that.options.config.mode === 'static'){
            that._createStaticHTMLContainers();
        } else if(that.options.config.mode === 'workflow'){
            that._createWorkflowHTMLContainers();
        } else if(that.options.config.mode === 'hybrid'){
            that._createHybridHTMLContainers();
        }

        if(that.state === 'practice'){
            // 3. get the next task
            // 4. fetch the next task
            var apiClient = that._getApiClient();
            apiClient.getNextTask('practice', function(data) {
                if(Object.keys(data).length === 0 && data.constructor === Object){
                    that.state = 'required';
                    that._fetchRequiredTasks();
                } else {
                    apiClient.setData(data['id']);
                    that.instanceId = 'practice-'+data['name'].split('-')[0];
                    if(that.options.config.mode === 'static'){
                        that._renderStaticDesign(data);
                    } else if(that.options.config.mode === 'workflow'){
                        that._renderWorkflowDesign(data);
                    } else if(that.options.config.mode === 'hybrid'){
                        that._renderHybridDesign(data);
                    }


                    var ele = $(".preloader-wrapper");
                    ele.remove();
                    var ele = $("#progress-bar-text");
                    ele.text("Practice Task Progress: " + completed_tasks.toString() + " / 3");
                    console.log("Updated Practice Tasks! "+completed_tasks);

                    // attach the submit button handlers
                    $(".submit-btn").click(function(e){
                        that._submitResponse(e);
                    });
                }
            });
        } else if (that.state === 'required') {

            // 3. get the next task
            // 4. fetch the next task
            var apiClient = that._getApiClient();
            apiClient.getNextTask('required', function(data) {
                if(Object.keys(data).length === 0 && data.constructor === Object){
                    // we're done!
                    // transition to the next step of the experiment
                    // transition to the next step of the experiment
                    if(that.options.config.lab_study){
                        swal("Phase I completed! Let's take a moment to see how you've done!");
                        that.state = 'reviewing';
                        that._parseLabelHistory();
                    } else {
                        incrementExperimentWorkflowIndex(csrftoken, window.user, window.experiment);
                    }
                } else {
                    apiClient.setData(data['id']);
                    that.instanceId = data['name'].split('-')[0];
                    that.instanceData = data;
                    if(that.options.config.mode === 'static'){
                        that._renderStaticDesign(data);
                    } else if(that.options.config.mode === 'workflow'){
                        that._renderWorkflowDesign(data);
                    } else if(that.options.config.mode === 'hybrid'){
                        that._renderHybridDesign(data);
                    }
                    

                    // update the progress bar
                    var ele = $(".preloader-wrapper");
                    ele.remove();
                    var ele = $("#progress-bar-text");
                    ele.text("Task Progress: " + completed_tasks.toString() + " / " + that.options.config.total_tasks);

                    // attach the submit button handlers
                    $(".submit-btn").click(function(e){
                        that._submitResponse(e);
                    });
                }
            });
        } else if (that.state === 'reviewing'){
            // pop the seen item from the task queue, and save the remaining things to see
            var toReview = JSON.parse(window.localStorage.getItem('labelsToReview'));
            var seenItem = toReview.shift();
            window.localStorage.setItem('labelsToReview', JSON.stringify(toReview));

            // store the reviewed label
            var labelsReviewed;
            if(window.localStorage.getItem('labelsReviewed') === null){
                labelsReviewed = [];
            } else {
                labelsReviewed = JSON.parse(window.localStorage.getItem('labelsReviewed'));
            }

            var lastLabel = window.localStorage.getItem('lastLabel');
            seenItem.labels.push(lastLabel);
            labelsReviewed.push(seenItem)
            window.localStorage.setItem('labelsReviewed', JSON.stringify(labelsReviewed));

            // get the next task
            if(toReview.length > 0){
                var dataRecords = JSON.parse(window.localStorage.getItem('dataRecords'));
                var data = dataRecords[toReview[0].instanceId];
                var apiClient = that._getApiClient();
                apiClient.setData(data['id']);
                that.instanceId = data['name'].split('-')[0];
                that.instanceData = data;

                // render the workflow design
                that._renderWorkflowDesign(data);

                // attach the submit button handlers
                $(".submit-btn").click(function(e){
                    that._submitResponse(e);
                });

                var ele = $(".preloader-wrapper");
                ele.remove();
                var ele = $("#progress-bar-text");
                ele.text("Task Progress: " + (3-toReview.length+1) + " / 3");
                $("#loading_modal").modal('close'); 
            } else {
                // we have no remaining tasks
                that.state = 'visualization';
                that._startVisualizationProcess();
            }

        }

    }, 

    _submitResponse: function(e){
        var that = this;      
        var label = e.currentTarget.id.replace('-submit-btn', '').replace('-node', '').replace('_label', '').replace('_', '-');

        // if label is static, it means we aren't using the workflow design
        if(label === 'static'){
            label = that.current_label;
            if(label === undefined){
                swal('Error: You must select a label before submitting.');
                return;
            }
        } else if(that.options.config.mode === 'hybrid'){
            if(!($("input:radio[name='group1']").is(":checked"))){
                swal('Error: You must indicate whether or not this category sounds good befoer submitting.');
                return;
            }
        }

        console.log("Trying to submit ...");

         // Get toast DOM Element, get instance, then call remove function
        if($('.toast').length){
            var toastElement = $('.toast').first()[0];
            var toastInstance = toastElement.M_Toast;
            toastInstance.remove();
        }

        if(that.state === 'practice' && this.options.config.mode == 'static'){
            var correct_answer = $("#correct_answer").text();
            var correct_explanation = $("#correct_explanation").html().replace("&lt;br/&gt;", "<br/>");

            var correct = that.current_label.toLowerCase();
            var current = correct_answer;
            if(correct === current){
                Materialize.toast(correct_explanation+"<br/><br/> Good job! That's correct. :D", 30000, 'rounded')
            } else {
                Materialize.toast(correct_explanation+"<br/><br/> Try again. That's incorrect. :(", 30000, 'rounded')
                return;
            }
        }

        // scroll to the top
        $('html, body').animate({
            scrollTop: $('#task-container').offset().top - 70 //#DIV_ID is an example. Use the id of your destination on the page
        }, 'slow');

        // in local storage, store:
        // entity1,entity2,RL,S,label1,label2,label3
        var labelHistory;
        var dataRecords
        if(window.localStorage.getItem("labelHistory") === null){
            labelHistory = {};
            dataRecords = {};
        } else {
            labelHistory = JSON.parse(window.localStorage.getItem("labelHistory"));
            dataRecords = JSON.parse(window.localStorage.getItem("dataRecords"));
        }

        if(!(that.instanceId in labelHistory)){
            labelHistory[that.instanceId] = [];
        }
        if(!(that.instanceId in dataRecords)){
            dataRecords[that.instanceId] = that.instanceData;
        }

        // add the label the history
        labelHistory[annotator.instanceId].push(label)

        // save
        window.localStorage.setItem('labelHistory', JSON.stringify(labelHistory));
        window.localStorage.setItem('dataRecords', JSON.stringify(dataRecords));
        window.localStorage.setItem('lastLabel', JSON.stringify(label));

        // save a response through the api client
        var apiClient = that._getApiClient();
        apiClient.create('response', {
                content: {'label': label, 'path': that.logicPath, 'justification': that.justification}
            }, function(result){
                that._resetInterface();
        });
    },

    _parseLabelHistory: function(){
        var that = this;
        var labelHistory = JSON.parse(window.localStorage.getItem('labelHistory'));
        
        if(!labelHistory){
            alert("CRTIICAL FAILURE.");
        }

        var testJson = {
            "1":[
               "partially-unreadable-relation",
               "wrong-relation"
            ],
            "3":[
               "misleading-relation",
               "misleading-relation"
            ],
            "16":[
               "correct-relation",
               "incomplete-relation"
            ],
            "36":[
               "no-relation",
               "no-relation"
            ],
            "47":[
               "indirect-relation",
               "misleading-relation"
            ],
            "58":[
               "wrong-relation",
               "incomplete-relation"
            ],
            "101":[
               "incomplete-relation",
               "incomplete-relation",
            ],
            "109":[
               "misleading-relation",
               "correct-relation"
            ]
         }

        var experts = {
            1: {
                expert1: 4,
                expert2: 4
            }, 
            3: {
                expert1: 6,
                expert2: 6
            }, 
            9: {
                expert1: 4,
                expert2: 4
            }, 
            16: {
                expert1: 2,
                expert2: 2
            }, 
            35: {
                expert1: 7,
                expert2: 3
            }, 
            36: {
                expert1: 5,
                expert2: 5
            }, 
            47: {
                expert1: 1,
                expert2: 1
            }, 
            58: {
                expert1: 4,
                expert2: 5
            }, 
            101: {
                expert1: 4,
                expert2: 7
            }, 
            109: {
                expert1: 4,
                expert2: 2
            }
        };

        var labelMapping = {
            'no-relation': 1,
            'indirect-relation': 2,
            'wrong-relation': 3,
            'incomplete-relation': 4,
            'misleading-relation': 5,
            'correct-relation': 6,
            'partially-unreadable-relation': 7
        }

        var inconsistentAndCompleteExpertDisagreement = [];
        var inconsistentAndPartialExpertDisagreement = [];
        var consistentAndExpertDisagreement = [];

        // classify the consistencies / inconsistencies
        for (var item in labelHistory) {
            // skip loop if the property is from prototype
            if (!labelHistory.hasOwnProperty(item)) continue;
            if (item.indexOf('practice') !== -1 || item.indexOf('none') !== -1) continue;
        
            // for each item, we need to check:
            // 1. is the person consistent?
            // 2. do they agree with the experts?

            var labels = labelHistory[item];
            var enumeratedLabel = labelMapping[labels[0]];
            var isConsistent = false;
            var agreesWithAtLeastOneExpert = false;
            var agreesWithBothExports = false;
            
            // check consistent
            if(labels[0] === labels[1]){
                isConsistent = true;
            }

            // check agreement
            if(enumeratedLabel === experts[item]['expert1'] && enumeratedLabel === experts[item]['expert2']){
                agreesWithBothExports = true;
                agreesWithAtLeastOneExpert = true;
            } else if ((enumeratedLabel === experts[item]['expert1'] && enumeratedLabel !== experts[item]['expert2']) || (enumeratedLabel !== experts[item]['expert1'] && enumeratedLabel === experts[item]['expert2'])){
                agreesWithAtLeastOneExpert = true;
            } 

            // create a new object to store when reviewing instances for a third time.
            var instance = that.data[item];
            instance['labels'] = labels;
            instance['instanceId'] = item;

            // bucket the case
            if(!isConsistent && !agreesWithAtLeastOneExpert) {
                instance['type'] = 'inconsistent-complete-disagreement';
                inconsistentAndCompleteExpertDisagreement.push(instance);
            } else if(!isConsistent && agreesWithAtLeastOneExpert){
                instance['type'] = 'inconsistent-partial-disagreement';
                inconsistentAndPartialExpertDisagreement.push(instance);
            } else if(isConsistent && !agreesWithAtLeastOneExpert) {
                instance['type'] = 'consistent-complete-disagreement';
                consistentAndExpertDisagreement.push(instance);
            }
        }

        // once we get here, we have populated buckets. now, we merge and pick the top three.
        var reviewList = inconsistentAndCompleteExpertDisagreement.concat(inconsistentAndPartialExpertDisagreement);
        reviewList = reviewList.concat(consistentAndExpertDisagreement);
        var toReview = reviewList.slice(0, 3);

        console.log("ToReview: "+toReview.length+" instances");
        this._startReviewProcess(toReview);

    },

    _startReviewProcess: function(toReview){
        var that = this;
        if(window.localStorage.getItem('labelsToReview') === null){
            window.localStorage.setItem('labelsToReview', JSON.stringify(toReview));
        }

        toReview = JSON.parse(window.localStorage.getItem('labelsToReview'));

        // get the next task
        if(toReview.length > 0){
            var dataRecords = JSON.parse(window.localStorage.getItem('dataRecords'));
            var data = dataRecords[toReview[0].instanceId];
            var apiClient = that._getApiClient();
            apiClient.setData(data['id']);
            that.instanceId = data['name'].split('-')[0];
            that.instanceData = data;

            // render the workflow design
            that._renderWorkflowDesign(data);

            // attach the submit button handlers
            $(".submit-btn").click(function(e){
                that._submitResponse(e);
            });

            var ele = $(".preloader-wrapper");
            ele.remove();
            var ele = $("#progress-bar-text");
            ele.text("Task Progress: " + (3-toReview.length+1) + " / " + toReview.length);
            $("#loading_modal").modal('close'); 
        } else {
            // we have no remaining tasks
            that.state = 'visualization';
            that._startVisualizationProcess();
        }
    },

    _getNextVisualization: function(){
        var that = this;
        var reviewed = JSON.parse(window.localStorage.getItem('labelsReviewed'));
        firstItem = reviewed.shift();
        window.localStorage.setItem('labelsReviewed', JSON.stringify(reviewed));

        if(reviewed.length > 0){
            // 1. clear the html workspace
            $(that.element).empty();

            $(that.element).append("<div id='canvas'></div>");
            $(that.element).append('<div id="infobar"></div>');


            // append the task's metadata
            var metadata = '<button class="next-visualization">Next</button><p id="instanceInfo"><table  id="bottomTable"><tr><td><b>Entities:</b></td><td>'+reviewed[0].e1+' .. '+reviewed[0].e2+'</td></tr><tr><td><b>Relation Label:</b></td><td>'+reviewed[0].relation+'</td></tr><tr><td><b>Sentence:</b></td><td>'+reviewed[0].sentence+'</td></tr></table></p>';
            $("#infobar").append(metadata);

            that._drawVisualization(reviewed[0].labels)

            // add the handler
            $(".next-visualization").click(function(){
                that._getNextVisualization();
            });
        } else {
            swal("You're Done!");
            setTimeout(function(){
                incrementExperimentWorkflowIndex(csrftoken, window.user, window.experiment);
            }, 10000);
        }
    },

    _startVisualizationProcess: function(){
        var that = this;
        $("#loading_modal").modal('close'); 
        $("footer").hide();
        // 1. clear the html workspace
        $(that.element).empty();

        $(that.element).append("<div id='canvas'></div>");
        $(that.element).append('<div id="infobar"></div>');


        // get the first item
        var reviewed = JSON.parse(window.localStorage.getItem('labelsReviewed'));

        // append the task's metadata
        var metadata = '<button class="next-visualization">Next</button><p id="instanceInfo"><table id="bottomTable"><tr><td><b>Entities:</b></td><td>'+reviewed[0].e1+' .. '+reviewed[0].e2+'</td></tr><tr><td><b>Relation Label:</b></td><td>'+reviewed[0].relation+'</td></tr><tr><td><b>Sentence:</b></td><td>'+reviewed[0].sentence+'</td></tr></table></p>';
        $("#infobar").append(metadata);

        that._drawVisualization(reviewed[0].labels)

        // add the handler
        $(".next-visualization").click(function(){
            that._getNextVisualization();
        });

        swal("Phase II Completed: How do you think you did?");
    },

    _drawVisualization: function(labels){
        var treeData = [
            {
              "name": "root",
              "question": "Are entities directly related?",
              "parent": "null",
              "type": "black",
              "level": "red",
              "children": [
                {
              "name": "node2",
                  "question": "Is there a third entity E3?",
                  "parent": "root",
                  "children": [
                    {
                      "name": "Category1",
                  "question": "Category 1: No Relation",
                      "parent": "node2"
                    },
                    {
                      "name": "node3",
                  "question": "Can you connect E1 to E2 through E3?",
                      "parent": "node2",
                  "children": [
                    {
                  "name": "Category2",
                  "question": "Category 2: Indirect Relation",
                  "parent": "node3"
                    }
                  ]
                    }
                  ]
                },
                {
                  "name": "node4",
              "question": "Is the label RL readable enough?",
                  "parent": "root",
              "children": [
                {
                  "name": "Category3",
                  "question": "Category 3: Wrong Relation Label",
                  "parent": "node4"
                },
                {
                  "name": "node5",
                  "question": "Is the label RL semantically complete?",
                  "parent": "node4",
                  "children": [
                    {
                  "name": "Category4",
                  "question": "Category 4: Incomplete Relation Label",
                  "parent": "node5"
                    },
                    {
                  "name": "node6",
                  "question": "Is the label RL consistent with the sentence S?",
                  "parent": "node5",
                  "children": [
                    {
                      "name": "Category5",
                      "question": "Category 5: Misleading Relation Label",
                      "parent": "node6"
                    },
                    {
                      "name": "node7",
                      "question": "Are there minor readability issues in RL?",
                      "parent": "node6",
                      "children": [
                        {
                      "name": "Category6",
                      "question": "Category 6: Correct Relation Label",
                      "parent": "node7"
                        },
                        {
                      "name": "Category7",
                      "question": "Category 7: Partially Unredable Relation Label",
                      "parent": "node7"
                        }
                      ]
                    }
                  ]
                    }
                  ]
                }
              ]
                }
              ]
            }
          ];
          
          
          // ************** Generate the tree diagram	 *****************
          var margin = {top: 10, right: 180, bottom: 20, left: 180},
              width = window.innerWidth * 0.99 - margin.right - margin.left,
              height = window.innerHeight * 0.8 - margin.top - margin.bottom;
              
          var i = 0,
              duration = 750,
              root;
              
          var Path1 = [];
          var Path2 = [];
          var Path3 = [];
          
          var entity1, entity2, RL, S;
          
          var Path1_Set, Path2_Set;
          
          var labelMapping = {
            'no-relation': 1,
            'indirect-relation': 2,
            'wrong-relation': 3,
            'incomplete-relation': 4,
            'misleading-relation': 5,
            'correct-relation': 6,
            'partially-unreadable-relation': 7
        } 
          
          var tree = d3.layout.tree()
              .size([height, width]);
          
          var diagonal = d3.svg.diagonal()
              .projection(function(d) { return [d.y, d.x]; });
          
          var svg = d3.select("body").select("#canvas").append("svg")  
              .attr("width", width + margin.right + margin.left)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
          
          
          d3.select(self.frameElement).style("height", "500px");
          
          
          
          function update(source) {
          
            // Compute the new tree layout.
            var nodes = tree.nodes(root).reverse(),
                links = tree.links(nodes);
          
            // Normalize for fixed-depth.
            nodes.forEach(function(d) { d.y = d.depth * 180; });
          
            // Update the nodes�
            var node = svg.selectAll("g.node")
                .data(nodes, function(d) { return d.id || (d.id = ++i); });
          
            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .on("click", click);
          
            nodeEnter.append("circle")
                .attr("r", 1e-6)
                //.style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
                .style("stroke", function(d) { return d.type; })
                //.style("fill", function(d) { return d.level; });
                .style("fill", function(d) {
                                if (Path1.includes(d.name) && Path2.includes(d.name)) return "green";
                                if (Path1.includes(d.name)) return "red";
                                if (Path2.includes(d.name)) return "purple";
                                return "lightsteelblue"; });
          
            nodeEnter.append("text")
                .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
                .attr("dy", ".35em")
                .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                .text(function(d) { return d.question; })
                .style("fill-opacity", 1e-6);
          
            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
          
            console.log("Here is the set!");
            console.log(Path1_Set);
            nodeUpdate.select("circle")
                .attr("r", 10)
                //.style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
                .style("stroke", function(d) {if (Path1.includes(d.name) || Path2.includes(d.name) || Path3.includes(d.name)) return "black";})
                //.style("fill", function(d) { return d.level; });
                .style("fill", function(d) {
                                if (Path1.includes(d.name) && Path2.includes(d.name) && Path3.includes(d.name)) d.color = "green";
                                else if (Path1.includes(d.name) && Path2.includes(d.name) || Path1.includes(d.name) && Path3.includes(d.name) || Path2.includes(d.name) && Path3.includes(d.name)) d.color = "#4233FF";
                                else if (Path1.includes(d.name)) d.color = "orange";
                                else if (Path2.includes(d.name)) d.color = "orange";
                                else if (Path3.includes(d.name)) d.color = "purple"; // maroon color: #6F2D12
                                else d.color = "lightsteelblue";
                                return d.color; });
          
            console.log("Test ....");
            console.log(Path1);
            console.log(Path1.indexOf("root"));
            console.log(Path1[0]);
            nodeUpdate.select("text")
                .style("fill-opacity", 1);
          
            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .remove();
          
            nodeExit.select("circle")
                .attr("r", 1e-6);
          
            nodeExit.select("text")
                .style("fill-opacity", 1e-6);
          
            // Update the links�
            var link = svg.selectAll("path.link")
                .data(links, function(d) { return d.target.id; });
          
          
            // Enter any new links at the parent's previous position.
            var linkEnter = link.enter().insert("path", "g")
                .attr("class", "link")
                //.style("stroke", function(d) {return d.target.level; })
                .style("stroke", function(d) {return d.target.color; })
                .attr("d", function(d) {
                  var o = {x: source.x0, y: source.y0};
                  return diagonal({source: o, target: o});
                });
          
          
            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", diagonal);
          
            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                  var o = {x: source.x, y: source.y};
                  return diagonal({source: o, target: o});
                })
                .remove();
          
            // Stash the old positions for transition.
            nodes.forEach(function(d) {
              d.x0 = d.x;
              d.y0 = d.y;
            });
          }
          
          // Toggle children on click.
          function click(d) {
            if (d.children) {
              d._children = d.children;
              d.children = null;
            } else {
              d.children = d._children;
              d._children = null;
            }
            update(d);
          }
          
          function getPathByCategoryID(categoryID1, categoryID2, categoryID3) {
              if (categoryID1 == 1) Path1.push("root", "node2", "Category1");
              else if (categoryID1 == 2) Path1.push("root", "node2", "node3", "Category2");
              else if (categoryID1 == 3) Path1.push("root", "node4", "Category3");
              else if (categoryID1 == 4) Path1.push("root", "node4", "node5", "Category4");
              else if (categoryID1 == 5) Path1.push("root", "node4", "node5", "node6", "Category5");
              else if (categoryID1 == 6) Path1.push("root", "node4", "node5", "node6", "node7", "Category6");
              else if (categoryID1 == 7) Path1.push("root", "node4", "node5", "node6", "node7", "Category7");
              
              if (categoryID2 == 1) Path2.push("root", "node2", "Category1");
              else if (categoryID2 == 2) Path2.push("root", "node2", "node3", "Category2");
              else if (categoryID2 == 3) Path2.push("root", "node4", "Category3");
              else if (categoryID2 == 4) Path2.push("root", "node4", "node5", "Category4");
              else if (categoryID2 == 5) Path2.push("root", "node4", "node5", "node6", "Category5");
              else if (categoryID2 == 6) Path2.push("root", "node4", "node5", "node6", "node7", "Category6");
              else if (categoryID2 == 7) Path2.push("root", "node4", "node5", "node6", "node7", "Category7");
              
              if (categoryID3 == 1) Path3.push("root", "node2", "Category1");
              else if (categoryID3 == 2) Path3.push("root", "node2", "node3", "Category2");
              else if (categoryID3 == 3) Path3.push("root", "node4", "Category3");
              else if (categoryID3 == 4) Path3.push("root", "node4", "node5", "Category4");
              else if (categoryID3 == 5) Path3.push("root", "node4", "node5", "node6", "Category5");
              else if (categoryID3 == 6) Path3.push("root", "node4", "node5", "node6", "node7", "Category6");
              else if (categoryID3 == 7) Path3.push("root", "node4", "node5", "node6", "node7", "Category7");
          }
          
          function pickColor(node) {
              var color;
              
              if (Path1.includes(node) && Path2.includes(node) && Path3.includes(node)) d.color = "green";
              else if (Path1.includes(node) && Path2.includes(d.name) || Path1.includes(d.name) && Path3.includes(d.name) || Path2.includes(d.name) && Path3.includes(d.name)) d.color = "#4233FF";
              else if (Path1.includes(node)) color = "orange";
              else if (Path2.includes(node)) color = "orange";
              else if (Path3.includes(node)) color = "purple"; // maroon color: #6F2D12
              else color = "lightsteelblue";
          }

          console.log("Numbers:")
          console.log(labelMapping[labels[0]]);
          console.log(labelMapping[labels[1]]);
          console.log("Labels2: "+labels[2].replace('"', ""));
          console.log(labelMapping[labels[2].replace('"', "").replace('"', "")]);
          getPathByCategoryID(Number(labelMapping[labels[0]]), Number(labelMapping[labels[1]]), Number(labelMapping[labels[2].replace('"', "").replace('"', "")]));
          
          Path1_Set = new Set(Path1);
          Path2_Set = new Set(Path2);
          
          root = treeData[0];
          root.x0 = height / 2;
          root.y0 = 0;
            
          update(root);
    }
});
