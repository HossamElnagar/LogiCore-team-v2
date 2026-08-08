import json

out_path = r'd:\LogiCore-team-v2\plan_text.md'
transcript_path = r'C:\Users\Admin\.gemini\antigravity\brain\f282f965-6fce-4c57-80b4-2cc2dbd26d67\.system_generated\logs\transcript_full.jsonl'

with open(transcript_path, 'r', encoding='utf-8') as f, open(out_path, 'w', encoding='utf-8') as out:
    for line in f:
        try:
            data = json.loads(line)
            # Find the model's text responses
            if data.get('source') == 'MODEL' and data.get('type') == 'PLANNER_RESPONSE':
                content = data.get('content', '')
                if 'Maker' in content and 'Checker' in content and ('CSV' in content or 'Finance' in content):
                    out.write(f"--- Step {data.get('step_index')} ---\n")
                    out.write(content + "\n\n")
            # Also find user inputs in case the user provided it
            if data.get('source') == 'USER_EXPLICIT' or data.get('source') == 'USER_QUEUED':
                content = data.get('content', '')
                if 'Maker' in content and 'Checker' in content and ('CSV' in content or 'Finance' in content):
                    out.write(f"--- USER Step {data.get('step_index')} ---\n")
                    out.write(content + "\n\n")
        except Exception as e:
            pass
