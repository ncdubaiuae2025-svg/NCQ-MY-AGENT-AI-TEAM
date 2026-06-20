from base_agent import BaseAgent
class ExecutorAgent(BaseAgent):
    def __init__(self): super().__init__(name="Executor")
    def run(self, context: dict) -> dict:
        # منطق executor هنا
        return {"status": "success", "message": "وكيل Executor يعمل"}
