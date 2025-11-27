const axios = require('axios');

class MessagingServiceSync {
  constructor() {
    this.messagingServiceUrl = process.env.MESSAGING_SERVICE_URL || 'http://3.233.111.80';
  }

  async syncCommunity(community) {
    try {
      console.log(`📤 Sincronizando comunidad ${community.id} con Messaging Service...`);
      
      const response = await axios.post(`${this.messagingServiceUrl}/api/v1/groups/sync`, {
        externalId: community.id,
        name: community.name,
        description: community.description,
        imageUrl: community.image_url,
        groupType: 'community',
        maxMembers: 500,
        isPublic: community.visibility === 'public',
        creatorProfileId: community.created_by
      }, {
        timeout: 5000
      });

      console.log(`✅ Comunidad sincronizada: ${response.data.message}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error sincronizando comunidad ${community.id}:`, error.message);
      // No lanzar error para no bloquear la creación de la comunidad
      return null;
    }
  }

  async syncMemberJoin(communityId, profileId) {
    try {
      console.log(`📤 Sincronizando miembro ${profileId} al grupo ${communityId}...`);
      
      const response = await axios.post(
        `${this.messagingServiceUrl}/api/v1/group-members/${communityId}/sync-add`,
        {
          profileId: profileId,
          status: 'active'
        },
        {
          timeout: 5000
        }
      );

      console.log(`✅ Miembro sincronizado: ${response.data.message}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error sincronizando miembro:`, error.message);
      return null;
    }
  }

  async syncMemberLeave(communityId, profileId) {
    try {
      console.log(`📤 Sincronizando salida de miembro ${profileId} del grupo ${communityId}...`);
      
      const response = await axios.delete(
        `${this.messagingServiceUrl}/api/v1/group-members/${communityId}/sync-remove/${profileId}`,
        {
          timeout: 5000
        }
      );

      console.log(`✅ Salida de miembro sincronizada`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error sincronizando salida de miembro:`, error.message);
      return null;
    }
  }
}

module.exports = new MessagingServiceSync();