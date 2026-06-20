import os
import yaml
from dotenv import load_dotenv
load_dotenv() 
import schedule
import threading
import time
import importlib
import json
from typing import Dict
from base_agent import BaseAgent

class AgentEngine:
    def __init__(self, config_path: str = "ncq_agent_engine.yaml"):
        self.config = self._load_config(config_path)
        self.agents: Dict[str, BaseAgent] = {}
        self.skills = {}
        self.mesh_history = []
        self._load_agents()
        self._load_skills()

    def _load_config(self, path: str) -> Dict:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _load_agents(self):
        agents_config = self.config.get('agents', {})
        for agent_name, agent_cfg in agents_config.items():
            if not agent_cfg.get('enabled', True):
                continue
            try:
                module = importlib.import_module(f'agents.{agent_name}')
                agent_class = getattr(module, f'{agent_name.capitalize()}Agent')
                agent = agent_class()
                agent.config = agent_cfg
                self.agents[agent_name] = agent
                print(f"✅ تم تحميل الوكيل: {agent_name}")
            except Exception as e:
                print(f"❌ فشل تحميل {agent_name}: {e}")

    def _load_skills(self):
        skills_path = "skills"
        if not os.path.exists(skills_path):
            return
        for filename in os.listdir(skills_path):
            if filename.endswith('.py') and not filename.startswith('__'):
                skill_name = filename.replace('.py', '')
                try:
                    self.skills[skill_name] = importlib.import_module(f'skills.{skill_name}')
                    print(f"✅ تم تحميل المهارة: {skill_name}")
                except Exception as e:
                    print(f"❌ فشل تحميل {skill_name}: {e}")

    def run_agent(self, agent_name: str, context: Dict = None):
        if agent_name not in self.agents:
            return {"error": "Agent not found"}
        agent = self.agents[agent_name]
        result = agent.run(context or {})
        self.mesh_history.append({
            "agent": agent_name,
            "result": result,
            "timestamp": time.time()
        })
        return result

    def execute_chain(self, chain_name: str, initial_context: Dict = None):
        chain_config = self.config.get('chains', {}).get(chain_name)
        if not chain_config:
            return {"error": "Chain not found"}
        context = initial_context or {}
        for step in chain_config.get('steps', []):
            agent_name = step.get('agent')
            result = self.run_agent(agent_name, context)
            if not result or result.get('error'):
                if chain_config.get('on_failure') == 'stop':
                    return {"error": f"Failed at {agent_name}"}
            context[step.get('skill')] = result
        return context

    def run_scheduled_tasks(self):
        for agent_name, agent in self.agents.items():
            sched = agent.config.get('schedule')
            if sched:
                schedule.every().day.at(sched).do(lambda a=agent_name: self.run_agent(a))
        while True:
            schedule.run_pending()
            time.sleep(60)

    def start(self):
        print("🚀 بدء تشغيل NCQ Agent Engine...")
        threading.Thread(target=self.run_scheduled_tasks, daemon=True).start()
        print("✅ المحرك يعمل. اضغط Ctrl+C للإيقاف.")
        try:
            while True:
                time.sleep(10)
        except KeyboardInterrupt:
            print("🛑 إيقاف...")

if __name__ == "__main__":
    engine = AgentEngine()
    engine.start()