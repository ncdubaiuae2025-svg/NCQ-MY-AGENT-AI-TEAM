from base_agent import BaseAgent
class AccountantAgent(BaseAgent):
    def __init__(self): super().__init__(name="Accountant")
    def run(self, context: dict) -> dict:
        # منطق accountant هنا
        return {"status": "success", "message": "وكيل Accountant يعمل"}
