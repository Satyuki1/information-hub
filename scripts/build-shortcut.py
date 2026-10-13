import plistlib, uuid
from pathlib import Path
root=Path(__file__).resolve().parent.parent
ids=[str(uuid.uuid4()).upper() for _ in range(4)]
def variable(value): return {'Value':value,'WFSerializationType':'WFTextTokenAttachment'}
def output(i,name): return variable({'Type':'ActionOutput','OutputUUID':ids[i],'OutputName':name})
def text(value): return {'Value':{'string':value,'attachmentsByRange':{}},'WFSerializationType':'WFTextTokenString'}
def token_text(i,name): return {'Value':{'string':'\ufffc','attachmentsByRange':{'{0, 1}':{'Type':'ActionOutput','OutputUUID':ids[i],'OutputName':name}}},'WFSerializationType':'WFTextTokenString'}
def action(name,i,**params): return {'WFWorkflowActionIdentifier':'is.workflow.actions.'+name,'WFWorkflowActionParameters':{'UUID':ids[i],**params}}
workflow={
 'WFWorkflowName':'分享到资讯汇集','WFWorkflowClientVersion':'3036.0.4.2','WFWorkflowMinimumClientVersion':900,
 'WFWorkflowIcon':{'WFWorkflowIconStartColor':4251333119,'WFWorkflowIconGlyphNumber':59511},
 'WFWorkflowTypes':['ActionExtension'],
 'WFWorkflowInputContentItemClasses':['WFURLContentItem','WFStringContentItem','WFSafariWebPageContentItem'],
 'WFWorkflowNoInputBehavior':{'Name':'WFWorkflowNoInputBehaviorAskForInput','Parameters':{'ItemClass':'WFStringContentItem'}},
 'WFWorkflowImportQuestions':[],
 'WFWorkflowActions':[
 action('gettext',0,WFTextActionText={'Value':{'string':'\ufffc','attachmentsByRange':{'{0, 1}':{'Type':'ExtensionInput'}}},'WFSerializationType':'WFTextTokenString'}),
 action('downloadurl',1,WFURL='https://zeng-daily-shares.tangcheng475899188.workers.dev/api/collect',WFHTTPMethod='POST',WFHTTPBodyType='JSON',WFJSONValues={'Value':{'WFDictionaryFieldValueItems':[{'WFItemType':0,'WFKey':text('input'),'WFValue':token_text(0,'文本')}]},'WFSerializationType':'WFDictionaryFieldValue'}),
 action('getvalueforkey',2,WFInput=output(1,'URL 的内容'),WFDictionaryKey='message',WFGetDictionaryValueType='Value'),
 action('showresult',3,Text=token_text(2,'词典值'))
 ]}
(root/'outputs').mkdir(exist_ok=True)
with open(root/'outputs'/'zeng-share-unsigned.shortcut','wb') as f: plistlib.dump(workflow,f)
print('Unsigned shortcut generated (no credentials).')
