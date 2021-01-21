import logging
from typing import List

from modules.states import State


class CellData:
    """
    Contains slot cell metrics data
    """
    valid_keys = ['slot_id', 'stage_id', 'voltage', 'current', 'amphour', 'watthour', 'temp', 'timestamp']

    def __init__(self, values: dict):
        """

        :param values:
        """
        self.log = logging.getLogger(__name__)
        self.check_parameters(values)

        self._slot_id = values['slot_id']
        self._stage_id = values['stage_id']
        self._timestamp = values['timestamp']
        self._voltage = values['voltage']
        self._current = values['current']
        self._amphour = values['amphour']
        self._watthour = values['watthour']
        self._temp = values['temp']

    @property
    def slot_id(self):
        """

        :return:
        """
        return self._slot_id

    def check_parameters(self, values: dict) -> None:
        """

        :param values:
        :return:
        """
        if any(True for k in self.valid_keys if k not in values):
            raise ValueError('Missing parameter, expected {}'.format(self.valid_keys))

        if any(True for k in values if k not in self.valid_keys):
            raise ValueError('Unexpected parameter, expected only {}'.format(self.valid_keys))

    @property
    def timestamp(self):
        return self._timestamp

    @property
    def to_json(self) -> dict:
        """

        :return:
        """
        return {
            i: getattr(self, "_" + i) for i in self.valid_keys
        }


class Cell:
    """
    Cell object containing information about the cell, metrics, etc
    """

    def __init__(self, _id: int):
        self.log = logging.getLogger(__name__)

        self._id = _id
        self._state = State.idle
        self._stage = State.idle
        self._model = None
        self._manufacturer = None
        self._cycle_count = 0

        self._history = []

    def set_cell(self, _id: str, model: str, manufacturer: str) -> None:
        """

        :param _id:
        :param model:
        :param manufacturer:
        """
        self._id = _id
        self._model = model
        self._manufacturer = manufacturer

    def add_history(self, cell_data) -> None:
        """

        :param cell_data:
        :return:
        """
        self._history.append(cell_data)

    def get_history(self) -> List[CellData]:
        """

        :return: list of cell history
        """
        return list(stat for stat in self._history)

    def get_last_history(self) -> CellData:
        """
        Returns the latest cell data or an empty dict()
        :return: dic
        """
        return self.get_history()[-1] if len(self.get_history()) else list()

    def clear_history(self) -> None:
        """

        :return:
        """
        self._history = []

    @property
    def state(self):
        """

        :return:
        """
        return self._state

    @state.setter
    def state(self, set_state):
        """

        :param set_state:
        :return:
        """
        self._state = set_state
        # if set_state == State.idle:
        #     self._cycle_count = 0
        #     self._cycle_total = 0
        #     self.state_now = -1
        #     self.full_list = []
        #     self.pending = 0
        #     self._voltage = None
        #     self._amphours = None
        #     self._watthours = None
        #     self._current = None
        #     self._temp = None

    def cell_status_since(self, timestamp):
        selected = filter(lambda x: x.timestamp > timestamp, self.get_history()[::-1])
        output = {
            "state": self.state,
            "history": selected[::-1]
        }
        logging.critical(("SINCE: {}".format(selected)))
        return output

if __name__ == "__main__":
    c = Cell(0)
    print(c)
