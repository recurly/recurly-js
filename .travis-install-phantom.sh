#!/bin/bash
set -e

# check to see if protobuf folder is empty
if [ ! -d "$HOME/travis-phantomjs" ]; then
  mkdir $HOME/travis-phantomjs
  wget https://s3.amazonaws.com/travis-phantomjs/phantomjs-2.0.0-ubuntu-12.04.tar.bz2 -O $HOME/travis-phantomjs/phantomjs-2.0.0-ubuntu-12.04.tar.bz2
  tar -xvf $HOME/travis-phantomjs/phantomjs-2.0.0-ubuntu-12.04.tar.bz2 -C $HOME/travis-phantomjs
  export PATH=$HOME/travis-phantomjs:$PATH
else
  echo 'Using cached phantom-js';
fi
