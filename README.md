# CrowdCurio Text Annotator Library

The CrowdCurio Text Annotation Library implements classification tasks for text documents. 

## Build Process
We use Browserify, Wachify and Uglify in our build processes. All three tools can be installed with NPM.

>npm install -g browserify

>npm install -g watchify

>npm install -g uglify-js

To build the script bundle *without* minification, run:
>browserify lib/main.js -o bundle.js

To build *with* minification, run:
>browserify lib/main.js | uglifyjs bundle.js

To watch for file changes and automatically bundle *without* minification, run:
>watchify lib/main.js -o bundle.js

## Contact
Mike Schaekermann, University of Waterloo