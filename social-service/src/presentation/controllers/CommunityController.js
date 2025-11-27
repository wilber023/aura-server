// presentation/controllers/CommunityController.js (Puerto 3002)
const { CommunityModel, CommunityMemberModel, UserProfileModel } = require('../../infrastructure/database/models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const axios = require('axios');

class CommunityController {
  constructor() {
    this.getAllCommunities = this.getAllCommunities.bind(this);
    this.getCommunityById = this.getCommunityById.bind(this);
    this.createCommunity = this.createCommunity.bind(this);
    this.updateCommunity = this.updateCommunity.bind(this);
    this.deleteCommunity = this.deleteCommunity.bind(this);
    this.joinCommunity = this.joinCommunity.bind(this);
    this.leaveCommunity = this.leaveCommunity.bind(this);
    this.getCommunityMembers = this.getCommunityMembers.bind(this);
    this.getUserCommunities = this.getUserCommunities.bind(this);
    this.searchCommunities = this.searchCommunities.bind(this);
    
    this.messagingServiceUrl = process.env.MESSAGING_SERVICE_URL || 'http://3.233.111.80/api/v1';
    console.log('🔧 CommunityController - Messaging URL:', this.messagingServiceUrl);
  }

  async getAllCommunities(req, res) {
    try {
      console.log('📋 GetAllCommunities - query params:', req.query);

      const {
        page = 1,
        limit = 10,
        category,
        tags,
        search
      } = req.query;

      const offset = (page - 1) * limit;

      let where = { is_active: true };

      if (category) {
        where.category = category;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        where.tags = { [Op.overlap]: tagArray };
      }

      console.log('🔍 Community filters:', where);

      const { count, rows } = await CommunityModel.findAndCountAll({
        where,
        include: [
          {
            model: UserProfileModel,
            as: 'creator',
            attributes: ['user_id', 'display_name', 'username']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      res.status(200).json({
        success: true,
        message: 'Comunidades obtenidas exitosamente',
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getCommunityById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      console.log('🔍 GetCommunityById - ID:', id);

      const community = await CommunityModel.findByPk(id, {
        include: [
          {
            model: UserProfileModel,
            as: 'creator',
            attributes: ['user_id', 'display_name', 'username']
          },
          {
            model: CommunityMemberModel,
            as: 'memberships',
            include: [
              {
                model: UserProfileModel,
                as: 'user',
                attributes: ['user_id', 'display_name', 'username']
              }
            ]
          }
        ]
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: 'Comunidad no encontrada'
        });
      }

      let userMembership = null;
      if (userId) {
        userMembership = await CommunityMemberModel.findOne({
          where: { community_id: id, user_id: userId }
        });
      }

      const communityData = community.toJSON();
      communityData.userMembership = userMembership;
      communityData.isMember = !!userMembership;

      res.status(200).json({
        success: true,
        message: 'Comunidad obtenida exitosamente',
        data: communityData
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }
 async createCommunity(req, res) {
  console.log('\n📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝');
  console.log('📝 CREATE COMMUNITY ENDPOINT LLAMADO');
  console.log('📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝📝');
  console.log('📝 Body:', req.body);
  console.log('📤 File:', req.file);
  console.log('👤 User:', req.user);
  console.log('\n');

  try {
    const { name, description, category, tags } = req.body;
    const creatorId = req.user.id;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y categoría son requeridos'
      });
    }

    let communityImageUrl = null;
    if (req.file) {
      communityImageUrl = req.file.path;
      console.log('✅ Imagen guardada:', communityImageUrl);
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch (e) {
        console.log('⚠️ Error parseando tags');
      }
    }

    const communityData = {
      id: uuidv4(),
      creator_id: creatorId,
      name,
      description: description || null,
      category,
      tags: parsedTags,
      community_image_url: communityImageUrl,
      members_count: 1,
      is_active: true
    };

    console.log('💾 Creando comunidad en BD...');
    const community = await CommunityModel.create(communityData);

    console.log('➕ Agregando creador como miembro...');
    await CommunityMemberModel.create({
      id: uuidv4(),
      community_id: community.id,
      user_id: creatorId,
      role: 'creator',
      joined_at: new Date()
    });

    console.log('✅ Comunidad creada en BD:', community.id);

    // 🔥 CREAR GRUPO DE CHAT - VERSIÓN CORREGIDA
    console.log('\n📡📡📡 CREANDO GRUPO DE CHAT 📡📡📡');
    
    try {
      const messagingUrl = this.messagingServiceUrl;
      console.log('🌐 Messaging URL:', messagingUrl);
      
      // 🔥 PASO 1: CREAR EL GRUPO
      console.log('📤 Paso 1: Creando grupo...');
      const groupPayload = {
        externalId: community.id,
        name: community.name,
        description: community.description,
        imageUrl: communityImageUrl,
        groupType: 'community',
        creatorProfileId: creatorId,
        maxMembers: 10000,
        isPublic: true
      };
      
      console.log('📦 Payload del grupo:', JSON.stringify(groupPayload, null, 2));
      
      const groupResponse = await axios.post(
        `${messagingUrl}/groups/sync`,
        groupPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 segundos
        }
      );
      
      console.log('✅ Grupo creado exitosamente!');
      console.log('📥 Status:', groupResponse.status);
      console.log('📥 Data:', JSON.stringify(groupResponse.data, null, 2));

      // 🔥 PASO 2: AGREGAR CREADOR AL GRUPO
      console.log('\n📤 Paso 2: Agregando creador al grupo...');
      const syncUrl = `${messagingUrl}/group-members/${community.id}/sync-add`;
      console.log('🌐 Sync URL:', syncUrl);
      
      const memberPayload = {
        profileId: creatorId,
        status: 'active'
      };
      
      console.log('📦 Payload del miembro:', JSON.stringify(memberPayload, null, 2));
      
      const memberResponse = await axios.post(
        syncUrl,
        memberPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      console.log('✅✅✅ CREADOR AGREGADO AL GRUPO ✅✅✅');
      console.log('📥 Status:', memberResponse.status);
      console.log('📥 Data:', JSON.stringify(memberResponse.data, null, 2));
      console.log('\n');
      
    } catch (chatError) {
      console.log('\n❌❌❌ ERROR CON GRUPO DE CHAT ❌❌❌');
      console.log('❌ Error message:', chatError.message);
      
      if (chatError.response) {
        console.log('❌ Response status:', chatError.response.status);
        console.log('❌ Response data:', JSON.stringify(chatError.response.data, null, 2));
        console.log('❌ Response headers:', chatError.response.headers);
      } else if (chatError.request) {
        console.log('❌ No response received');
        console.log('❌ Request config:', {
          url: chatError.config?.url,
          method: chatError.config?.method,
          headers: chatError.config?.headers,
          data: chatError.config?.data
        });
      } else {
        console.log('❌ Error setting up request:', chatError.message);
      }
      
      console.log('⚠️ Comunidad creada pero sin chat funcional');
      console.log('⚠️ El usuario deberá unirse manualmente al chat');
      console.log('\n');
    }

    // Retornar la comunidad creada
    const createdCommunity = await CommunityModel.findByPk(community.id, {
      include: [
        {
          model: UserProfileModel,
          as: 'creator',
          attributes: ['user_id', 'display_name', 'username']
        }
      ]
    });

    console.log('✅ Create community completado');
    res.status(201).json({
      success: true,
      message: 'Comunidad creada exitosamente',
      data: createdCommunity
    });

  } catch (error) {
    console.error('💥 ERROR EN CREATE COMMUNITY:', error);
    this._handleError(res, error);
  }
}




  async updateCommunity(req, res) {
    try {
      const { id } = req.params;
      const { name, description, category, tags } = req.body;
      const userId = req.user.id;

      console.log('✏️ UpdateCommunity - ID:', id, 'User:', userId);

      const community = await CommunityModel.findByPk(id);
      if (!community) {
        return res.status(404).json({
          success: false,
          message: 'Comunidad no encontrada'
        });
      }

      const membership = await CommunityMemberModel.findOne({
        where: { community_id: id, user_id: userId }
      });

      if (!membership || !['creator', 'admin'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar esta comunidad'
        });
      }

      let communityImageUrl = community.community_image_url;
      if (req.file) {
        communityImageUrl = req.file.path;
        console.log('✅ Nueva imagen:', communityImageUrl);
      }

      let parsedTags = community.tags;
      if (tags) {
        try {
          parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
        } catch (e) {
          console.log('⚠️ Error parseando tags');
        }
      }

      await community.update({
        name: name || community.name,
        description: description !== undefined ? description : community.description,
        category: category || community.category,
        tags: parsedTags,
        community_image_url: communityImageUrl
      });

      console.log('✅ Comunidad actualizada:', id);

      const updatedCommunity = await CommunityModel.findByPk(id, {
        include: [
          {
            model: UserProfileModel,
            as: 'creator',
            attributes: ['user_id', 'display_name', 'username']
          }
        ]
      });

      res.status(200).json({
        success: true,
        message: 'Comunidad actualizada exitosamente',
        data: updatedCommunity
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  async deleteCommunity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log('🗑️ DeleteCommunity - ID:', id, 'User:', userId);

      const community = await CommunityModel.findByPk(id);
      if (!community) {
        return res.status(404).json({
          success: false,
          message: 'Comunidad no encontrada'
        });
      }

      if (community.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Solo el creador puede eliminar la comunidad'
        });
      }

      await community.update({ is_active: false });

      res.status(200).json({
        success: true,
        message: 'Comunidad eliminada exitosamente'
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  async joinCommunity(req, res) {
    console.log('\n');
    console.log('🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪');
    console.log('🚪 JOIN COMMUNITY ENDPOINT LLAMADO');
    console.log('🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪');
    console.log('📍 Community ID:', req.params.id);
    console.log('👤 User ID:', req.user?.id);
    console.log('\n');

    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log('🔍 Buscando comunidad:', id);
      const community = await CommunityModel.findByPk(id);
      
      if (!community || !community.is_active) {
        console.log('❌ Comunidad no encontrada o inactiva');
        return res.status(404).json({
          success: false,
          message: 'Comunidad no encontrada o inactiva'
        });
      }

      console.log('✅ Comunidad encontrada:', community.name);

      console.log('🔍 Verificando membresía existente...');
      const existingMembership = await CommunityMemberModel.findOne({
        where: { community_id: id, user_id: userId }
      });

      if (existingMembership) {
        console.log('⚠️ Usuario ya es miembro');
        return res.status(400).json({
          success: false,
          message: 'Ya eres miembro de esta comunidad'
        });
      }

      console.log('➕ Agregando usuario a la comunidad...');
      await CommunityMemberModel.create({
        id: uuidv4(),
        community_id: id,
        user_id: userId,
        role: 'member',
        joined_at: new Date()
      });

      await community.increment('members_count');
      console.log('✅ Usuario agregado a comunidad en BD');

      // 🔥 SINCRONIZACIÓN CON SERVICIO DE MENSAJERÍA
      console.log('\n');
      console.log('📡📡📡 INICIANDO SINCRONIZACIÓN CON MENSAJERÍA 📡📡📡');
      const messagingUrl = this.messagingServiceUrl;
      const syncUrl = `${messagingUrl}/group-members/${id}/sync-add`;
      
      console.log('🌐 URL de sincronización:', syncUrl);
      console.log('👤 Profile ID:', userId);
      
      try {
        console.log('📤 Enviando petición POST...');
        
        const syncResponse = await axios.post(syncUrl, {
          profileId: userId,
          status: 'active'
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅✅✅ SINCRONIZACIÓN EXITOSA ✅✅✅');
        console.log('📥 Status:', syncResponse.status);
        console.log('📥 Data:', JSON.stringify(syncResponse.data));
        console.log('\n');
        
      } catch (syncError) {
        console.log('\n');
        console.log('❌❌❌ ERROR EN SINCRONIZACIÓN ❌❌❌');
        console.log('❌ Error message:', syncError.message);
        
        if (syncError.response) {
          console.log('❌ Response status:', syncError.response.status);
          console.log('❌ Response data:', JSON.stringify(syncError.response.data));
        } else if (syncError.request) {
          console.log('❌ No response received');
          console.log('❌ Request:', syncError.request);
        }
        
        console.log('⚠️ Continuando sin sincronización de chat...');
        console.log('\n');
      }

      console.log('✅ Join community completado');
      res.status(200).json({
        success: true,
        message: 'Te has unido a la comunidad exitosamente'
      });

    } catch (error) {
      console.error('💥 ERROR EN JOIN COMMUNITY:', error);
      this._handleError(res, error);
    }
  }

  async leaveCommunity(req, res) {
    console.log('\n');
    console.log('🚪🚪🚪 LEAVE COMMUNITY ENDPOINT LLAMADO 🚪🚪🚪');
    console.log('📍 Community ID:', req.params.id);
    console.log('👤 User ID:', req.user?.id);
    console.log('\n');

    try {
      const { id } = req.params;
      const userId = req.user.id;

      const community = await CommunityModel.findByPk(id);
      if (!community) {
        return res.status(404).json({
          success: false,
          message: 'Comunidad no encontrada'
        });
      }

      if (community.creator_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'El creador no puede salir de su propia comunidad'
        });
      }

      const membership = await CommunityMemberModel.findOne({
        where: { community_id: id, user_id: userId }
      });

      if (!membership) {
        return res.status(400).json({
          success: false,
          message: 'No eres miembro de esta comunidad'
        });
      }

      await membership.destroy();
      await community.decrement('members_count');
      console.log('✅ Usuario removido de comunidad en BD');

      // 🔥 SINCRONIZACIÓN CON SERVICIO DE MENSAJERÍA
      console.log('\n');
      console.log('📡📡📡 REMOVIENDO DE MENSAJERÍA 📡📡📡');
      
      try {
        const syncUrl = `${this.messagingServiceUrl}/group-members/${id}/sync-remove/${userId}`;
        console.log('🌐 URL:', syncUrl);
        
        const syncResponse = await axios.delete(syncUrl, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ Removido de mensajería, status:', syncResponse.status);
        console.log('\n');
        
      } catch (syncError) {
        console.log('❌ Error removiendo de mensajería:', syncError.message);
        console.log('\n');
      }

      res.status(200).json({
        success: true,
        message: 'Has salido de la comunidad exitosamente'
      });

    } catch (error) {
      console.error('💥 ERROR EN LEAVE COMMUNITY:', error);
      this._handleError(res, error);
    }
  }

  async getCommunityMembers(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      console.log('👥 GetCommunityMembers - ID:', id);

      const { count, rows } = await CommunityMemberModel.findAndCountAll({
        where: { community_id: id },
        include: [
          {
            model: UserProfileModel,
            as: 'user',
            attributes: ['user_id', 'display_name', 'username', 'avatar_url']
          }
        ],
        order: [['joined_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.status(200).json({
        success: true,
        message: 'Miembros obtenidos exitosamente',
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getUserCommunities(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      console.log('👤 GetUserCommunities - User:', userId);

      const { count, rows } = await CommunityMemberModel.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: CommunityModel,
            as: 'community',
            where: { is_active: true },
            include: [
              {
                model: UserProfileModel,
                as: 'creator',
                attributes: ['user_id', 'display_name', 'username']
              }
            ]
          }
        ],
        order: [['joined_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.status(200).json({
        success: true,
        message: 'Comunidades del usuario obtenidas exitosamente',
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  async searchCommunities(req, res) {
    try {
      const { q, category, tags } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'La búsqueda debe tener al menos 2 caracteres'
        });
      }

      console.log('🔍 SearchCommunities - Query:', q);

      let where = {
        is_active: true,
        [Op.or]: [
          { name: { [Op.like]: `%${q.trim()}%` } },
          { description: { [Op.like]: `%${q.trim()}%` } }
        ]
      };

      if (category) {
        where.category = category;
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        where.tags = { [Op.overlap]: tagArray };
      }

      const communities = await CommunityModel.findAll({
        where,
        include: [
          {
            model: UserProfileModel,
            as: 'creator',
            attributes: ['user_id', 'display_name', 'username']
          }
        ],
        order: [['members_count', 'DESC']],
        limit: 20
      });

      res.status(200).json({
        success: true,
        message: 'Búsqueda completada',
        data: communities
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  _handleError(res, error) {
    console.error('Error en CommunityController:', error.message);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: error.errors.map(e => e.message)
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un recurso con esos datos'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = CommunityController;