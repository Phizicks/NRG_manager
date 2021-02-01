class State:
    pass


class Discharging(State):
    def __eq__(self, value):
        return True if value == 1 else False


class BattDisconnected(State):
    def __eq__(self, value):
        return True if value == 2 else False


class Charging(State):
    def __eq__(self, value):
        return True if value == 3 else False


class BattDisconnect(State):
    def __eq__(self, value):
        return True if value == 4 else False


class Waiting(State):
    def __eq__(self, value):
        return True if value == 5 else False


class MeasuringIR(State):
    def __eq__(self, value):
        return True if value == 6 else False


class MeasuringIR10Sec(State):
    def __eq__(self, value):
        return True if value == 7 else False


class Idle(State):
    def __eq__(self, value):
        return True if value == 8 else False


class NotSet(State):
    def __eq__(self, value):
        return True if value == 0 else False


def get_state(state_id):
    if state_id == 0:
        return NotSet
    if state_id == 1:
        return Discharging
    if state_id == 2:
        return BattDisconnected
    if state_id == 3:
        return Charging
    if state_id == 4:
        return BattDisconnect
    if state_id == 5:
        return Waiting
    if state_id == 6:
        return MeasuringIR
    if state_id == 7:
        return MeasuringIR10Sec
    if state_id == 8:
        return Idle
