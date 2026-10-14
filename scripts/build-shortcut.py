"""Build a credential-free shortcut. Sign the result with Apple's shortcuts CLI."""
import plistlib
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = '20261014-3'
URL_PATTERN = r'^https://[A-Za-z0-9.-]+(?::[0-9]+)?/api/collect\?token=ihub_[A-Za-z0-9_-]{43}$'

def uid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, 'x-to-group/' + VERSION + '/' + name)).upper()

def variable(value):
    return {'Value': value, 'WFSerializationType': 'WFTextTokenAttachment'}

def output(name, label='文本'):
    return variable({'Type': 'ActionOutput', 'OutputUUID': uid(name), 'OutputName': label})

def text(value):
    return {'Value': {'string': value, 'attachmentsByRange': {}}, 'WFSerializationType': 'WFTextTokenString'}

def token_text(name, label='文本'):
    return {'Value': {'string': '\ufffc', 'attachmentsByRange': {'{0, 1}': output(name, label)['Value']}}, 'WFSerializationType': 'WFTextTokenString'}

def action(kind, name, **params):
    return {'WFWorkflowActionIdentifier': 'is.workflow.actions.' + kind,
            'WFWorkflowActionParameters': {'UUID': uid(name), **params}}

def condition(name, source):
    return action('conditional', name, GroupingIdentifier=uid(name + '-group'), WFControlFlowMode=0,
                  WFCondition=100, WFInput={'Type': 'Variable', 'Variable': output(source, '匹配项')})

def branch(name, mode):
    return action('conditional', name + ('-else' if mode == 1 else '-end'),
                  GroupingIdentifier=uid(name + '-group'), WFControlFlowMode=mode)

def build_workflow():
    return {
        'WFWorkflowName': '分享到 X to Group', 'WFWorkflowClientVersion': '3036.0.4.2',
        'WFWorkflowMinimumClientVersion': 900,
        'WFWorkflowIcon': {'WFWorkflowIconStartColor': 4251333119, 'WFWorkflowIconGlyphNumber': 59511},
        'WFWorkflowTypes': ['ActionExtension'],
        'WFWorkflowInputContentItemClasses': ['WFURLContentItem', 'WFStringContentItem', 'WFSafariWebPageContentItem'],
        'WFWorkflowNoInputBehavior': {'Name': 'WFWorkflowNoInputBehaviorAskForInput', 'Parameters': {'ItemClass': 'WFStringContentItem'}},
        'WFWorkflowImportQuestions': [{
            'ActionIndex': 1, 'Category': 'Parameter', 'DefaultValue': '', 'ParameterKey': 'WFTextActionText',
            'Text': '请粘贴官网「快捷指令」页复制的完整个人连接地址。不要填写 X 帖子地址；不要留空。'
        }],
        'WFWorkflowActions': [
            action('gettext', 'shared-input', WFTextActionText={'Value': {'string': '\ufffc', 'attachmentsByRange': {'{0, 1}': {'Type': 'ExtensionInput'}}}, 'WFSerializationType': 'WFTextTokenString'}),
            action('gettext', 'connection', WFTextActionText='', CustomOutputName='个人连接地址'),
            action('comment', 'help', WFCommentActionText='X to Group v2 · 如果每次都提示补填地址，请编辑上方「个人连接地址」文本，粘贴官网 /shortcut 页复制的完整地址。此处填写你的站点地址，不是 X 帖子链接。'),
            action('text.match', 'saved-match', WFMatchTextPattern=URL_PATTERN, text=token_text('connection', '个人连接地址')),
            condition('configured', 'saved-match'),
            action('gettext', 'saved-address', WFTextActionText=token_text('saved-match', '匹配项')),
            branch('configured', 1),
            action('ask', 'ask-address', WFAskActionPrompt='尚未配置有效的个人连接地址。请粘贴官网「快捷指令」页复制的 https://…/api/collect?token=ihub_… 地址（不是 X 链接）。本次补填不会自动保存；以后请填入编辑器第二个「文本」。', WFInputType='URL'),
            branch('configured', 2),
            action('text.match', 'validated-address', WFMatchTextPattern=URL_PATTERN, text=token_text('configured-end', '如果结果')),
            condition('valid', 'validated-address'),
            action('url', 'endpoint', WFURLActionURL=token_text('validated-address', '匹配项')),
            action('downloadurl', 'submit', WFURL=token_text('endpoint', 'URL'), WFHTTPMethod='POST', WFHTTPBodyType='JSON',
                   WFJSONValues={'Value': {'WFDictionaryFieldValueItems': [{'WFItemType': 0, 'WFKey': text('input'), 'WFValue': token_text('shared-input')}]}, 'WFSerializationType': 'WFDictionaryFieldValue'}),
            action('getvalueforkey', 'message', WFInput=output('submit', 'URL 的内容'), WFDictionaryKey='message', WFGetDictionaryValueType='Value'),
            action('showresult', 'result', Text=token_text('message', '词典值')),
            branch('valid', 1),
            action('showresult', 'invalid', Text='未发送：连接地址不完整或格式不正确。请在 Safari 登录你的 X to Group 站点，打开「快捷指令」页，点击「复制个人连接地址」。编辑本快捷指令，把地址填入第二个「文本」后重试。'),
            branch('valid', 2),
        ]
    }

if __name__ == '__main__':
    (ROOT / 'outputs').mkdir(exist_ok=True)
    with (ROOT / 'outputs' / 'x-to-group-unsigned.shortcut').open('wb') as f:
        plistlib.dump(build_workflow(), f)
    print('Shortcut v2 generated: personal URL validation and missing-configuration recovery; no credentials.')
