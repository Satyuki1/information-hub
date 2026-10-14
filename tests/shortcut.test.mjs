import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const flow=JSON.parse(execFileSync('python3',['-c',"import runpy,json; print(json.dumps(runpy.run_path('scripts/build-shortcut.py')['build_workflow']()))"],{encoding:'utf8'}));
const actions=flow.WFWorkflowActions, params=actions.map(a=>a.WFWorkflowActionParameters);
test('shortcut rejects missing, partial and post URLs before making a request',()=>{
 const match=actions.filter(a=>a.WFWorkflowActionIdentifier.endsWith('.text.match'));
 assert.equal(match.length,2);
 const pattern=new RegExp(match[0].WFWorkflowActionParameters.WFMatchTextPattern);
 for(const invalid of ['', 'https://x.com/user/status/123','https://team.example/api/collect','https://team.example/api/collect?token=ihub_short','http://team.example/api/collect?token=ihub_'+'a'.repeat(43)]) assert.equal(pattern.test(invalid),false);
 assert.ok(pattern.test('https://team.example/api/collect?token=ihub_'+'a'.repeat(43)));
 const request=actions.findIndex(a=>a.WFWorkflowActionIdentifier.endsWith('.downloadurl'));
 const guard=actions.findIndex((a,i)=>i>actions.indexOf(match[1])&&a.WFWorkflowActionIdentifier.endsWith('.conditional')&&params[i].WFControlFlowMode===0);
 assert.ok(guard<request);
 assert.equal(params[guard].WFInput.Variable.Value.OutputUUID,match[1].WFWorkflowActionParameters.UUID);
 assert.equal(params[request].WFURL.Value.attachmentsByRange['{0, 1}'].OutputUUID,params[request-1].UUID);
 const body=params[request].WFJSONValues.Value.WFDictionaryFieldValueItems[0];
 assert.equal(body.WFKey.Value.string,'input');
 assert.equal(body.WFValue.Value.attachmentsByRange['{0, 1}'].OutputUUID,params[0].UUID);
});
test('installer starts without credentials and asks for the saved connection URL',()=>{
 const question=flow.WFWorkflowImportQuestions[0];
 assert.equal(question.ActionIndex,1);assert.equal(params[1][question.ParameterKey],'');
 const ask=actions.find(a=>a.WFWorkflowActionIdentifier.endsWith('.ask'));
 assert.ok(ask);assert.match(ask.WFWorkflowActionParameters.WFAskActionPrompt,/不会自动保存/);
 assert.doesNotMatch(JSON.stringify(flow),/ihub_[A-Za-z0-9_-]{43}|sk-[a-z0-9]{20,}/);
 const seen=new Set();
 for(const p of params){const refs=[...JSON.stringify(p).matchAll(/"OutputUUID":"([^"]+)"/g)].map(m=>m[1]);for(const ref of refs)assert.ok(seen.has(ref),'output references must point to an earlier action');seen.add(p.UUID);}
});
