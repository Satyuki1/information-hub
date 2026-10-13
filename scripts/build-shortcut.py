import plistlib, uuid
from pathlib import Path
root=Path(__file__).resolve().parent.parent
ids=[str(uuid.uuid4()).upper() for _ in range(5)]
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
 # Asked once when the shortcut is added: the owner's personal token from /shortcut.
 # The signed file is shared by everyone; the token is what identifies the sharer.
 'WFWorkflowImportQuestions':[{'ActionIndex':1,'Category':'Parameter','DefaultValue':'','ParameterKey':'WFTextActionText','Text':'粘贴你在 information-hub「快捷指令」页复制的连接地址（https://…/api/collect?token=ihub_…）。'}],
 'WFWorkflowActions':[
 action('gettext',0,WFTextActionText={'Value':{'string':'\ufffc','attachmentsByRange':{'{0, 1}':{'Type':'ExtensionInput'}}},'WFSerializationType':'WFTextTokenString'}),
 action('gettext',1,WFTextActionText=''),
 # The pasted connection URL carries both the deployment and the owner's token,
 # so one signed file works for every information-hub installation.
 action('downloadurl',2,WFURL=token_text(1,'文本'),WFHTTPMethod='POST',WFHTTPBodyType='JSON',WFJSONValues={'Value':{'WFDictionaryFieldValueItems':[{'WFItemType':0,'WFKey':text('input'),'WFValue':token_text(0,'文本')}]},'WFSerializationType':'WFDictionaryFieldValue'}),
 action('getvalueforkey',3,WFInput=output(2,'URL 的内容'),WFDictionaryKey='message',WFGetDictionaryValueType='Value'),
 action('showresult',4,Text=token_text(3,'词典值'))
 ]}
(root/'outputs').mkdir(exist_ok=True)
with open(root/'outputs'/'zeng-share-unsigned.shortcut','wb') as f: plistlib.dump(workflow,f)
print('Unsigned shortcut generated (no credentials; the token is asked on import).')
