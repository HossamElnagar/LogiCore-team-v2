import json

out_path = r'd:\LogiCore-team-v2\plan_extract.md'
transcript_path = r'C:\Users\Admin\.gemini\antigravity\brain\f282f965-6fce-4c57-80b4-2cc2dbd26d67\.system_generated\logs\transcript_full.jsonl'

found_plan = False

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            
            # Search in tool calls
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if 'function' in call:
                        func = call['function']
                        if func.get('name') == 'default_api:write_to_file':
                            args = func.get('arguments', '')
                            if isinstance(args, str):
                                try:
                                    args = json.loads(args)
                                except:
                                    pass
                            
                            if isinstance(args, dict):
                                target = args.get('TargetFile', '')
                                content = args.get('CodeContent', '')
                                if 'implementation_plan.md' in target and ('Maker' in content or 'Finance' in content):
                                    with open(out_path, 'w', encoding='utf-8') as out:
                                        out.write(content)
                                    found_plan = True
                                elif 'Maker' in content and 'Finance Approval' in content:
                                    with open(out_path, 'w', encoding='utf-8') as out:
                                        out.write(content)
                                    found_plan = True
        except Exception as e:
            pass

print("Plan extracted: ", found_plan)
