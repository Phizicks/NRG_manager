import json
import logging
import os
import re
import sys
import threading
import time

from classes.cell import Cell, CellData
from modules.states import State
from modules.usbserial import USBSerial

# from modules.http import Http

cRed = "\033[31m"
cGreen = "\033[32m"
cYellow = "\033[33m"
cBlue = "\033[34m"
cMag = "\033[35m"
cCyan = "\033[36m"
cNorm = "\033[0m"


class profile:
    time_start = None
    time_end = None


class profiles:
    profiles = []
    index = 0


class Slot:
    def __init__(self, slot_id):
        """

        :param slot_id:
        """
        self.log = logging.getLogger(__name__)
        self._slot_id = slot_id
        self._state = State.idle
        self._profile = None
        self._cell = Cell()
        self._history = []

        self._cycle_count = 0
        self._stage = State.idle

    @property
    def status(self) -> dict:
        """

        :return:
        """
        return {
            "state": self._state,
        }

    @property
    def cell(self) -> Cell:
        """

        :return:
        """
        return self._cell

    @property
    def has_cell(self) -> bool:
        """

        :return:
        """
        return type(self.cell) is Cell

    @property
    def cell_status(self) -> CellData:
        """

        :return:
        """
        if self.has_cell:
            raise Exception("No cell set")
        if self.cell.state == State.idle:
            return []

        return self.cell.get_last_history()

    def clear_history(self) -> None:
        """

        :return:
        """
        if self.has_cell:
            self.log.debug("{}Cell in slot# {} reset, all history cleared{}".format(cCyan, self._slot_id, cNorm))
            self.cell.clear_history()

    @property
    def start_time(self):
        return self._start_time

    @start_time.setter
    def start_time(self, value):
        self._start_time = time.time()

    @property
    def elapsed_time(self):
        return time.time() - self._start_time

    def set_state(self, state):
        if not isinstance(state, State):
            raise ValueError("Expected type of '{}' but received '{}'".format(type(State), type(state)))

        self._state = state

        if state == State.discharging:
            self._cycle_count = 0
            self._cycle_total = 0
            self._stage = 'idle'
            self.state_now = -1
            self.full_list = []
            self.pending = 0
            self._voltage = None
            self._amphours = None
            self._watthours = None
            self._current = None
            self._temp = None

    # @state.setter
    def state(self, value):
        if value not in ['idle', 'charging', 'discharging', 'cycle', 'power']:
            raise ValueError("'{}' not a value state".format(value))
        if self._state != 'idle' and value != 'idle':
            raise ValueError("Cannot set new state of non idle cell")
        self._state = value

    def next_cycle(self):
        if self._cycle_total == 0:
            if self.state_now == 2:
                self.log.info("Cell1 charging cycle completed")
                self.set_state('idle')
                return
            if self.state_now == 7:
                self.log.info("Cell2 charging cycle completed")
                self.set_state('idle')
                return
            if self.state_now == 1:
                self.log.info("Cell1 discharging cycle completed")
                self.set_state('idle')
                return
            if self.state_now == 6:
                self.log.info("Cell2 discharging cycle completed")
                self.set_state('idle')
                return
        elif self._cycle_total > self._cycle_count:
            if self.state_now == 1:
                self.stage = "idle"
                self.log.info("Full cycle completed")
                return
            elif self.state_now == 2:
                # increase cycle count
                self.log.info("Cycle {} of {} completed".format(self._cycle_count, self._cycle_total))
                self._cycle_count += 1
        else:
            if self.state_now == 2:
                self.log.info("Cell1 cycle test completed")
                self.set_state('idle')
            if self.state_now == 1:
                self.stage = "idle"
                self.log.info("Full cycle completed")

    @property
    def get_history(self):
        return self._history

    def add_history(self, values):
        self._history.append(values)

    # def update(self, payload):
    #     """
    #
    #     :param payload:
    #     :return:
    #     """
    #     self._stage = payload['tags']['stage']
    #     self._voltage = payload['fields']['voltage']
    #     self._amphours = payload['fields']['amphour']
    #     self._watthours = payload['fields']['watthour']
    #     self._current = payload['fields']['current']
    #     self._temp = payload['fields']['temp']


class Cycler(threading.Thread):
    def __init__(self, group=None, target=None, name=None, comsevent=None, cyclerqueue=None, webqueue=None):
        threading.Thread.__init__(self, group=group, target=target, name=name)

        self.device = None
        self.total_slots = 2

        # Threading objects
        self.comsevent = comsevent
        self.webqueue = webqueue
        self.cyclerqueue = cyclerqueue

        self.log = logging.getLogger(__name__)

        self.states = {'1': 'Battery Disconnected ',
                       '2': 'Battery Discharge',
                       '3': 'Battery Charge',
                       '4': 'Battery Disconnect',
                       '5': 'Waiting 1 minute',
                       '6': 'Measuring IR',
                       '7': 'Measuring IR',
                       '8': 'Parking'
                       }
        self.states = {'1': 'Battery discharging ',
                       '2': 'Battery charging',
                       '3': 'End of discharge',
                       '4': 'End of charge',
                       '5': 'IR measuring',
                       '6': 'Idle'
                       }

        # Initialize slots
        self.slots = []
        for id in range(1, self.total_slots + 1):
            self.slots.append(Cell(id))

        self.log.debug("{}Number of cyclers configured: {}{}".format(cCyan, self.total_slots, cNorm))

    def is_valid_slot_id(self, slot_id: int):
        if slot_id < 0 or slot_id > self.total_slots - 1:
            return False
        return True

    def comm_init(self):
        while True:
            # Connect
            # ________
            self.device = USBSerial('/dev/ttyACM0')
            try:
                self.device.connect()
            except Exception as e:
                if not self.device:
                    self.log.error("Closing serial")
                    self.device.close()
                self.log.error("Serial connect failed: {}".format(e))
                time.sleep(5)
            else:
                self.log.info("Connected to serial")
                break

        while True:
            # Initialize
            # ___________
            try:
                while not self.sync():
                    time.sleep(0.1)
                self.log.info("Arduino sync completed")
            except Exception as e:
                time.sleep(5)
                self.log.error("Arduino sync failure: {}".format(e))
            else:
                self.log.info("Synced with arduino")
                break

    def connect(self):
        self.stage = 'connecting'
        self.log.info('Connecting')

        while not self.device.connect():
            time.sleep(1)
        self.stage = 'connected'
        self.log.info('Connected')

        return True

    # Communicate to arduino, ensure response
    # ________________________________________
    def sync(self):
        """

        :return:
        """
        if not self.device:
            raise ("Device not connected, device is: {}".format(self.device))

        self.log.debug("Sending NL to get a prompt")
        self.device.sendline("\n")

        self.log.debug("Fetching received lines")
        data = self.device.readlines()
        for line in data:
            self.log.debug("Received: {}{}{}".format(cBlue, line, cNorm))

        self.log.debug("Sending ? to get menu")
        self.device.sendline("?\n")
        time.sleep(0.1)

        data = self.device.readlines()
        for line in data:
            self.log.debug("Received: {}{}{}".format(cBlue, line, cNorm))
        for line in data:
            self.log.debug("Checking: {}{}{}".format(cBlue, line, cNorm))
            if '>' in line:
                # NEW if '> Select Mode:'  in line:
                self.stage = 'initialized'
                self.log.info(cGreen + 'Initialized' + cNorm)
                return True

        return False

    def get_slot_history(self, slot_id):
        return [c.to_json for c in self.slots[slot_id].get_history()]

    def get_slots_status(self):
        return self.webqueue.put({
            "message": json.dumps([
                self.slots[slot_id].get_history()[-1].to_json
                if len(self.slots[slot_id].get_history()) > 0 and self.slots[slot_id].state != State.idle else []
                for slot_id in range(0, self.total_slots)]),
            "code": 200,
            "mimetype": "application/json"
        })

    def charge_slot(self, slot_id, data):
        self.slots[slot_id].clear_history()
        settings = ""
        settings += "" if 'current' not in data or data['current'] == "" else "i{} ".format(data['current'])
        settings += "" if 'voltage' not in data or data['voltage'] == "" else "v{} ".format(data['voltage'])
        settings += "" if 'cutoffma' not in data or data['cutoffma'] == "" else "o{} ".format(data['cutoffma'])

        # Detect cells state
        if self.slots[slot_id].state != State.idle:
            return self.webqueue.put(
                    {
                        "message": "Slot {} is not idle".format(slot_id),
                        "code": 400,
                        "mimetype": "application/json"
                    })
        else:
            self.slots[slot_id].state = State.charging
            self.log.info("Started charge on Slot {} with settings:{}".format(slot_id, settings))

            self.device.sendline("n{}\n".format(slot_id + 1))
            time.sleep(0.1)
            self.device.sendline("c{} {}\n".format(slot_id + 1, settings))

            return self.webqueue.put(
                    {
                        "message": "Started charge on Slot {} with settings:{}".format(slot_id, settings),
                        "code": 200,
                        "mimetype": "application/json"
                    })

    def respond(self, message, code=200):
        """

        :param message:
        :param code:
        :return:
        """
        return {
            "message": message,
            "code": code
        }

    def format_data(self, slot_id, data):
        formatted = {
            "slot_id": int(slot_id),
            "stage_id": int(data[6][0]),
            "voltage": float(data[1]),
            "current": float(data[2]),
            "amphour": float(data[3]),
            "watthour": float(data[4]),
            "temp": float(data[5]),
            "timestamp": time.time()
        }
        return formatted

    def process_cycle_data(self, line):
        """

        :param line:
        :return:
        """
        #
        # check for actions
        # _______________
        match = re.search(r'> Cell (\d+) OVT, stopping', line)
        if match:
            slot_id = int(match.group(1)) - 1  # TODO zero base slots
            self.slots[slot_id].state = State.idle
            self.log.info("{}Slot{} is now IDLE{}".format(cGreen, slot_id, cNorm))
            return

        value_list = line.split(',')

        # Ignore remaining menu lines
        if line[0] == '>':
            return

        # Determine slot id
        try:
            # State = completed charge, exit out
            msg_type = int(value_list[0])
            # Set the slot_id
            if msg_type in {0, 1, 2, 3}:
                slot_id = 0
            elif msg_type in {5, 6, 7, 8}:
                slot_id = 1
            else:
                # Skip non cell# info (4 is debug)
                return
            self.log.debug("{}Received: {}{}".format(cCyan, value_list, cNorm))

            # Check if end of a cycle
            if msg_type in [1, 2, 6, 7]:
                self.log.info("{}Slot# {} is now IDLE{}".format(cGreen, slot_id, cNorm))
                self.slots[slot_id].state = State.idle
                return

            # Store data in slot data
            formatted = self.format_data(slot_id, value_list)
            cell_data = CellData(formatted)
            # slot_id = cell_data.slot_id
            self.slots[slot_id].add_history(cell_data)

            return cell_data

        except Exception as e:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            self.log.critical("{}Exception: '{}' {} {}:{}{}".format(cRed, e, exc_type, fname, exc_tb.tb_lineno, cNorm))

    def is_valid_slot(self, slot_id):
        if not self.is_valid_slot_id(slot_id):
            self.log.error("{}Invalid slot_id '{}'{}".format(cMag, slot_id, cNorm))
            self.webqueue.put({
                "message": "Invalid slot_id",
                "code": 400,
                "mimetype": "application/json"
            })
            return False
        return True

    # Running thread
    # _______________
    def run(self):
        """

        :return:
        """
        # Initialize serial device
        self.comm_init()
        self.log.info('{}Cycler process running{}'.format(cGreen, cNorm))

        try:
            # TODO remove test charging
            # ------------------------------------------------------------------------------------
            self.device.sendline("c{} {}\n".format(1, 'v4200 i100 o200'))

            while not self.comsevent.is_set():
                if self.device is None:
                    self.log.error("{}Re-initializing lost comms{}".format(cRed, cNorm))
                    self.comm_init()

                #
                # check for actions
                # _______________
                while not self.cyclerqueue.empty():
                    self.log.info("{}Messages in queue: {}{}".format(cMag, len(self.cyclerqueue.queue), cNorm))
                    payload = self.cyclerqueue.get()
                    action = payload['action']
                    self.log.info("{}Request: {}{}".format(cMag, payload, cNorm))

                    # define slot_id or -1
                    slot_id = -1 if 'slot_id' not in payload else int(payload['slot_id'])

                    #
                    # /api/history/#
                    #
                    if action == 'history':
                        self.is_valid_slot(slot_id)
                        self.webqueue.put(
                                {
                                    "message": json.dumps(self.get_slot_history(slot_id)),
                                    "code": 200,
                                    "mimetype": "application/json"
                                })
                    elif action == "status":  # and self.is_valid_slot(slot_id):
                        # self.get_slots_status(payload['lasttimestamp'])
                        self.get_slots_status()
                    elif action == "charge":
                        self.is_valid_slot(slot_id)
                        self.charge_slot(slot_id, payload)
                    else:
                        self.webqueue.put(
                                {
                                    "message": "Unknown API request [{}]".format(payload),
                                    "code": 404,
                                    "mimetype": "application/json"
                                })

                #
                # MAIN comms loop
                #
                #

                #
                # check for serial data
                # _______________
                for line in self.device.readlines():
                    if line:
                        data = self.process_cycle_data(line)

                time.sleep(0.5)
            # else:
            #     self.log.warning("{}Closing serial{}".format(cYellow, cNorm))
            #     self.device.close()
            #
            #     self.log.warning("{}Cycler abort requested{}".format(cYellow, cNorm))
            #     self.webqueue.put({
            #         "message": "Cycle cancelled",
            #         "code": 200,
            #         "mimetype": "application/json"
            #     })
            #     return

        except KeyboardInterrupt:
            self.log.warning("{}Cycler thread cancelled{}".format(cYellow, cNorm))
            raise KeyboardInterrupt

    def api_charge(self, cellid, data):
        """

        :param cellid:
        :param data:
        :return:
        """
        self.slots[cellid].clear_history()
        settings = ""
        settings += "" if 'current' not in data or data['current'] == "" else "i{} ".format(data['current'])
        settings += "" if 'voltage' not in data or data['voltage'] == "" else "v{} ".format(data['voltage'])
        settings += "" if 'cutoffma' not in data or data['cutoffma'] == "" else "o{} ".format(data['cutoffma'])

        # Detect cells state
        if self.slots[cellid].state != 'idle':
            return self.respond("Cell {} not idle".format(cellid + 1), 400)
        else:
            self.slots[cellid].state = 'charging'
            self.log.info("Started charge on Cell {} with settings:{}".format(cellid + 1, settings))

            self.device.sendline("n{}\n".format(cellid + 1))
            time.sleep(0.1)
            self.device.sendline("c{} {}\n".format(cellid + 1, settings))

            return self.respond("Started charge on Cell {} with settings:{}".format(cellid + 1, settings), 200)

    def api_discharge(self, cellid, data):
        """

        :param cellid:
        :param data:
        :return:
        """
        self.slots[cellid].clear_history()
        settings = ""
        settings += "" if 'discma' not in data or data['discma'] == "" else "i{} ".format(data['discma'])
        settings += "" if 'cutoffmv' not in data or data['cutoffmv'] == "" else "v{} ".format(data['cutoffmv'])
        settings += "" if 'mode' not in data or data['mode'] == "" else "m{} ".format(data['mode'])

        # Detect cells state
        if self.slots[cellid].state != 'idle':
            return self.respond("Cell {} not idle".format(cellid + 1), 400)
        else:
            self.slots[cellid].state = 'discharging'
            self.log.info("Started discharge on Cell {} settings:{}".format(cellid + 1, settings))

            self.device.sendline("n{}\n".format(cellid + 1))
            time.sleep(0.1)
            self.device.sendline("d{} {}\n".format(cellid + 1, settings))

            return self.respond("Started discharge on Cell {} with settings:{}".format(cellid + 1, settings), 200)

    def api_cycle(self, cellid, data):
        """

        :param cellid:
        :param data:
        :return:
        """
        self.slots[cellid].clear_history()
        settings = ""
        settings += "" if 'discma' not in data or data['discma'] == "" else "y{} ".format(data['discma'])
        settings += "" if 'cutoffmv' not in data or data['cutoffmv'] == "" else "v{} ".format(data['cutoffmv'])
        settings += "" if 'mode' not in data or data['mode'] == "" else "m{} ".format(data['mode'])
        settings += "" if 'chrma' not in data or data['chrma'] == "" else "k{} ".format(data['chrma'])
        settings += "" if 'chrmv' not in data or data['chrmv'] == "" else "u{} ".format(data['chrmv'])
        settings += "" if 'cutoffma' not in data or data['cutoffma'] == "" else "o{} ".format(data['cutoffma'])
        settings += "" if 'cycles' not in data or data['cycles'] == "" else "l{} ".format(data['cycles'])

        # Detect cells state
        if self.slots[cellid].state != 'idle':
            return self.respond("Cell {} not idle".format(cellid + 1), 400)
        else:
            self.slots[cellid].state = 'cycle'
            self.slots[cellid]._cycle_total = int(data['cycles'] if data['cycles'] != "" else 1)
            self.log.info("Cycle start on Cell {} settings:{}".format(cellid + 1, settings))
            self.device.sendline("n{}\n".format(cellid + 1))
            time.sleep(0.1)
            self.device.sendline("y{} {}\n".format(cellid + 1, settings))

            return self.respond("Cycle started on Cell {}".format(cellid + 1), 200)

    def api_stop(self, cellid, data):
        """

        :param cellid:
        :param data:
        :return:
        """
        if self.slots[cellid].state == 'idle':
            return self.respond("Cell {} is already idle".format(cellid + 1), 400)
        else:
            self.device.sendline("n{}\n".format(cellid + 1))
            self.log.info("Stopping Cell {} currently:{}".format(cellid + 1,
                                                                 self.slots[cellid].state))
            self.slots[cellid].set_state('idle')
            return self.respond("Stopping Cell {}".format(cellid + 1), 200)

    def api_status(self, cellid, params):
        """

        :param cellid:
        :param params:
        :return:
        """
        return self.respond([
            cid.status() for cid in self.slots
        ], 200)

    def api_history(self, slot_id: int):
        """

        :param slot_id:
        :param params:
        :return:
        """

        return self.respond(self.slots[slot_id].get_history, 200)
