var jQuery = require('jquery');
var $ = jQuery;
require('jquery-ui-browserify');

$.widget('crowdcurio.TextAnnotator', {

    options: {
        apiClient: new CrowdCurioClient(),
    },

    _create: function() {
        var that = this;
        console.log('TextAnnotator initialized.')
    },

});
