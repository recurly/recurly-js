# Disables non-blocking stdout to prevent cat write errors
python -c 'import os,sys,fcntl; flags = fcntl.fcntl(sys.stdout, fcntl.F_GETFL); fcntl.fcntl(sys.stdout, fcntl.F_SETFL, flags&~os.O_NONBLOCK);'
pip install httplib2 crcmod
sudo apt-get -y install libnss3
