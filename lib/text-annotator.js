var jQuery = require('jquery');
var $ = jQuery;
require('jquery-ui-browserify');

$.widget('crowdcurio.TextAnnotator', {

    options: {
        apiClient: undefined,
    },

    _create: function() {
        var that = this;
        console.log('TextAnnotator initialized.');

        that._createHTMLContent();

        var apiClient = that._getApiClient();

        // init the client
        apiClient.init({
            user: window.user,
            task: window.task,
            experiment: window.experiment,
            condition: window.condition
        });

        // fetch the next data object
        apiClient.getNextTask('required', function(data) {
            var numberOfButtonsPerRow, currentRow, buttonColumnClass;
            var submissionButton = $(that.element).find('.submission-button button');
            var content = data.content;
            var textContainer = $(that.element).find('.classification-content');
            textContainer.html(content.text);
            $(that.element).find('.annotation').show();
        });
    },

    _getApiClient: function() {
        var that = this;
        return that.options.apiClient;
    },

    _createHTMLContent: function() {
        var that = this;
        var content = ' \
            <div class="annotation"> \
                <div class="row"> \
                    <div class="col s12 m6 box-container"> \
                        <div class="card"> \
                            <div class="card-content blue-grey darken-1 white-text"> \
                                <p class="classification-content flow-text"></p> \
                            </div> \
                            <div class="card-action"> \
                                <div class="classification-labels"></div> \
                                <div class="confidence-buttons"> \
                                    <div class="confidence-question"></div> \
                                    <div class="buttons-container"></div> \
                                </div> \
                                <div class="num-data-highlights-required-message card-panel yellow accent-1"></div> \
                            </div> \
                        </div> \
                        <div class="submission-button"> \
                            <button class="btn-floating btn-large waves-effect waves-light blue"><i class="fa fa-check" disabled></i></button> \
                        </div> \
                    </div> \
                </div> \
            </div> \
        ';
        $(that.element).html(content);
    },

});
