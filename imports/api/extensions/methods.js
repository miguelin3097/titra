import AdmZip from 'adm-zip'
import Extensions from './extensions'
import { checkAdminAuthentication } from '../../utils/server_method_helpers'

Meteor.methods({
  async addExtension({ zipFile }) {
    await checkAdminAuthentication(this)
    const regex = /^data:.+\/(.+);base64,(.*)$/
    const matches = zipFile.match(regex)
    const data = matches[2]
    let zip
    if (data) {
      zip = new AdmZip(Buffer.from(data, 'base64'))
    } else {
      return new Meteor.Error('Invalid extension upload.')
    }
    const newExtension = {}
    for (const zipEntry of zip.getEntries()) {
      if (zipEntry.entryName === 'extension.json') {
        const extensionDetails = JSON.parse(zipEntry.getData().toString('utf-8'))
        extensionDetails.userId = this.userId
        extensionDetails.isActive = true
        Object.assign(newExtension, extensionDetails)
      }
      if (zipEntry.entryName === 'client.js') {
        newExtension.client = zipEntry.getData().toString('utf-8')
      }
      if (zipEntry.entryName === 'server.js') {
        newExtension.server = zipEntry.getData().toString('utf-8')
      }
    }
    if (!await Extensions.findOneAsync({ name: newExtension.name })) {
      Extensions.insert(newExtension)
      return 'notifications.success'
    }
    return new Meteor.Error('Extension has been added before.')
  },
  async removeExtension({ extensionId }) {
    await checkAdminAuthentication(this)
    const extension = await Extensions.findOneAsync({ _id: extensionId })
    if (extension) {
      Extensions.remove({ _id: extension._id })
      return 'notifications.success'
    }
    return new Meteor.Error('Extension does not exist.')
  },
  async launchExtension({ extensionId }) {
    await checkAdminAuthentication(this)
    const extension = await Extensions.findOneAsync({ _id: extensionId })
    if (extension) {
      eval(extension.server)
      return 'notifications.success'
    }
    return new Meteor.Error('Extension does not exist')
  },
  async toggleExtensionState({ extensionId, state }) {
    await checkAdminAuthentication(this)
    const extension = await Extensions.findOneAsync({ _id: extensionId })
    if (extension) {
      await Extensions.updateAsync({ _id: extension._id }, { $set: { isActive: state } })
      return 'notifications.success'
    }
    return new Meteor.Error('Extension does not exist.')
  },
})
