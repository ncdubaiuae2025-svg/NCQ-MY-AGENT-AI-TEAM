from base_agent import BaseAgent
class GuardianAgent(BaseAgent):
    def __init__(self): super().__init__(name="Guardian")
    def run(self, context: dict) -> dict:
        # منطق guardian هنا
        return {"status": "success", "message": "وكيل Guardian يعمل"}
