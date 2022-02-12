# Cycler2 web python UI

## Install

### Setup python
```
sudo apt-get update
sudo apt-get -y install python3 python3-venv
sudo python3 -mpip upgrade
```

### Setup environment
```
git clone git@github.com:Phizicks/NRG_manager.git

python3 -mvenv NRG_manager
cd NRG_manager
python3 -mpip install -r requirements.txt
```

## Run
```
source bin/activate

python3 main.py --device /dev/ttyACM0 --slots 2
```