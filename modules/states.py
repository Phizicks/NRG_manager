from enum import Enum


class State(Enum):
    class Discharge:
        def value(self):
            return 1

    class Charge:
        def value(self):
            return 2

    class Waiting:
        def value(self):
            return 3

    class ChargeEnd:
        def value(self):
            return 4

    class IRcheck:
        def value(self):
            return 5

    class Idle:
        def value(self):
            return 6

    discharging = 1
    charging = 2
    waiting = 3
    charged_end = 4
    ir_check = 5
    idle = 6

# 0. Cell 1 periodic status
# 1. Cell 1 end of discharge stats
# 2. Cell 1 end of charge stats
# 3. Cell 1 IR debug
# 4. Buffer pack voltage/system status
# 5. Cell 2 periodic status
# 6. Cell 2 end of discharge stats
# 7. Cell 2 end of charge stats
# 8. Cell 2 IR debug


