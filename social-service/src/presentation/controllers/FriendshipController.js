// FriendshipController.js - VERSIÓN CORREGIDA

const { FriendshipModel, UserProfileModel } = require('../../infrastructure/database/models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

class FriendshipController {
  constructor() {
    this.sendFriendRequest = this.sendFriendRequest.bind(this);
    this.acceptFriendRequest = this.acceptFriendRequest.bind(this);
    this.rejectFriendRequest = this.rejectFriendRequest.bind(this);
    this.getFriendRequests = this.getFriendRequests.bind(this);
    this.getFriends = this.getFriends.bind(this);
    this.getFriendshipStatus = this.getFriendshipStatus.bind(this);
    this.removeFriend = this.removeFriend.bind(this);
  }

  /**
   * Enviar solicitud de amistad
   */
  async sendFriendRequest(req, res) {
    try {
      const requesterId = req.user.id;
      const { friend_id } = req.body;

      console.log('📤 SendFriendRequest - From:', requesterId, 'To:', friend_id);

      // Validar campos requeridos
      if (!friend_id) {
        return res.status(400).json({
          success: false,
          message: 'friend_id es requerido'
        });
      }

      // No se puede enviar solicitud a sí mismo
      if (requesterId === friend_id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes enviarte una solicitud de amistad a ti mismo'
        });
      }

      // Verificar que el usuario destinatario existe
      const addresseeUser = await UserProfileModel.findOne({ 
        where: { user_id: friend_id } 
      });
      
      if (!addresseeUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario destinatario no encontrado'
        });
      }

      // ✅ CORREGIDO: Verificar si ya existe una solicitud o amistad
      const existingFriendship = await FriendshipModel.findOne({
        where: {
          [Op.or]: [
            { 
              requester_id: requesterId, 
              addressee_id: friend_id 
            },
            { 
              requester_id: friend_id, 
              addressee_id: requesterId 
            }
          ]
        }
      });

      if (existingFriendship) {
        let message = '';
        
        switch (existingFriendship.status) {
          case 'pending':
            if (existingFriendship.requester_id === requesterId) {
              message = 'Ya enviaste una solicitud de amistad a este usuario';
            } else {
              message = 'Este usuario ya te envió una solicitud de amistad. Ve a "Recibidas" para aceptarla.';
            }
            break;
          case 'accepted':
            message = 'Ya son amigos';
            break;
          case 'blocked':
            message = 'No se puede enviar solicitud a este usuario';
            break;
          case 'rejected':
            // Permitir reenviar si fue rechazada hace más de 30 días
            const daysSinceRejection = Math.floor(
              (new Date() - new Date(existingFriendship.responded_at)) / (1000 * 60 * 60 * 24)
            );
            
            if (daysSinceRejection < 30) {
              message = `Solicitud previamente rechazada. Puedes reintentar en ${30 - daysSinceRejection} días.`;
            } else {
              // Eliminar la solicitud rechazada antigua y permitir nueva
              await existingFriendship.destroy();
              console.log('🔄 Solicitud rechazada antigua eliminada, permitiendo nueva');
              break;
            }
            break;
        }
        
        if (message) {
          return res.status(400).json({
            success: false,
            message,
            existingStatus: existingFriendship.status
          });
        }
      }

      // ✅ Crear nueva solicitud de amistad
      const friendship = await FriendshipModel.create({
        id: uuidv4(),
        requester_id: requesterId,
        addressee_id: friend_id,
        status: 'pending',
        requested_at: new Date(),
        is_active: true
      });

      console.log('✅ Solicitud de amistad enviada:', friendship.id);

      res.status(201).json({
        success: true,
        message: 'Solicitud de amistad enviada exitosamente',
        data: {
          id: friendship.id,
          requester_id: friendship.requester_id,
          addressee_id: friendship.addressee_id,
          status: friendship.status,
          requested_at: friendship.requested_at,
          created_at: friendship.created_at
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Aceptar solicitud de amistad
   */
  async acceptFriendRequest(req, res) {
    try {
      const { friendshipId } = req.params;
      const userId = req.user.id;

      console.log('✅ AcceptFriendRequest - Friendship:', friendshipId, 'User:', userId);

      const friendship = await FriendshipModel.findByPk(friendshipId);
      
      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud de amistad no encontrada'
        });
      }

      // Solo el destinatario puede aceptar la solicitud
      if (friendship.addressee_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para aceptar esta solicitud'
        });
      }

      // Verificar que esté pendiente
      if (friendship.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `La solicitud ya fue ${friendship.status === 'accepted' ? 'aceptada' : friendship.status}`
        });
      }

      // Aceptar la solicitud
      await friendship.update({ 
        status: 'accepted',
        responded_at: new Date()
      });

      console.log('✅ Solicitud de amistad aceptada:', friendshipId);

      res.status(200).json({
        success: true,
        message: 'Solicitud de amistad aceptada exitosamente',
        data: {
          id: friendship.id,
          requester_id: friendship.requester_id,
          addressee_id: friendship.addressee_id,
          status: friendship.status,
          requested_at: friendship.requested_at,
          responded_at: friendship.responded_at,
          created_at: friendship.created_at,
          updated_at: friendship.updated_at
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Rechazar solicitud de amistad
   */
  async rejectFriendRequest(req, res) {
    try {
      const { friendshipId } = req.params;
      const userId = req.user.id;

      console.log('❌ RejectFriendRequest - Friendship:', friendshipId, 'User:', userId);

      const friendship = await FriendshipModel.findByPk(friendshipId);
      
      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Solicitud de amistad no encontrada'
        });
      }

      // Solo el destinatario puede rechazar la solicitud
      if (friendship.addressee_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para rechazar esta solicitud'
        });
      }

      // Verificar que esté pendiente
      if (friendship.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `La solicitud ya fue ${friendship.status}`
        });
      }

      // Rechazar la solicitud
      await friendship.update({
        status: 'rejected',
        responded_at: new Date()
      });

      console.log('✅ Solicitud de amistad rechazada:', friendshipId);

      res.status(200).json({
        success: true,
        message: 'Solicitud de amistad rechazada exitosamente'
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtener solicitudes de amistad pendientes
   */
  async getFriendRequests(req, res) {
    try {
      const userId = req.user.id;
      const { type = 'received' } = req.query;

      console.log('📋 GetFriendRequests - User:', userId, 'Type:', type);

      let whereCondition = { 
        status: 'pending',
        is_active: true
      };

      if (type === 'received') {
        whereCondition.addressee_id = userId;
      } else if (type === 'sent') {
        whereCondition.requester_id = userId;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Tipo debe ser "received" o "sent"'
        });
      }

      const friendRequests = await FriendshipModel.findAll({
        where: whereCondition,
        order: [['requested_at', 'DESC']]
      });

      console.log(`📊 Encontradas ${friendRequests.length} solicitudes ${type}`);

      res.status(200).json({
        success: true,
        message: `Solicitudes ${type === 'received' ? 'recibidas' : 'enviadas'} obtenidas exitosamente`,
        data: friendRequests
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtener lista de amigos
   */
  async getFriends(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      console.log('👥 GetFriends - User:', userId);

      const { count, rows } = await FriendshipModel.findAndCountAll({
        where: {
          status: 'accepted',
          is_active: true,
          [Op.or]: [
            { requester_id: userId },
            { addressee_id: userId }
          ]
        },
        order: [['responded_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const friends = rows.map(friendship => {
        const friend_id = friendship.requester_id === userId 
          ? friendship.addressee_id 
          : friendship.requester_id;
        
        return {
          friendship_id: friendship.id,
          friend_id: friend_id,
          status: friendship.status,
          since: friendship.responded_at || friendship.created_at,
          requested_at: friendship.requested_at
        };
      });

      console.log(`👥 Encontrados ${count} amigos`);

      res.status(200).json({
        success: true,
        message: 'Lista de amigos obtenida exitosamente',
        data: friends,
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

  /**
   * Verificar estado de amistad con un usuario
   */
  async getFriendshipStatus(req, res) {
    try {
      const userId = req.user.id;
      const { userId: targetUserId } = req.params;

      console.log('🔍 GetFriendshipStatus - User:', userId, 'Target:', targetUserId);

      if (userId === targetUserId) {
        return res.status(200).json({
          success: true,
          data: {
            status: 'self',
            message: 'Es tu propio perfil'
          }
        });
      }

      const friendship = await FriendshipModel.findOne({
        where: {
          [Op.or]: [
            { requester_id: userId, addressee_id: targetUserId },
            { requester_id: targetUserId, addressee_id: userId }
          ]
        }
      });

      if (!friendship) {
        return res.status(200).json({
          success: true,
          data: {
            status: 'none',
            message: 'Sin relación de amistad'
          }
        });
      }

      let statusMessage = '';
      let canAccept = false;
      let canReject = false;

      switch (friendship.status) {
        case 'pending':
          if (friendship.requester_id === userId) {
            statusMessage = 'Solicitud enviada (pendiente)';
          } else {
            statusMessage = 'Solicitud recibida (pendiente)';
            canAccept = true;
            canReject = true;
          }
          break;
        case 'accepted':
          statusMessage = 'Son amigos';
          break;
        case 'rejected':
          statusMessage = 'Solicitud rechazada';
          break;
        case 'blocked':
          statusMessage = 'Usuario bloqueado';
          break;
      }

      res.status(200).json({
        success: true,
        data: {
          friendship_id: friendship.id,
          status: friendship.status,
          message: statusMessage,
          is_requester: friendship.requester_id === userId,
          can_accept: canAccept,
          can_reject: canReject,
          requested_at: friendship.requested_at,
          responded_at: friendship.responded_at
        }
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Eliminar amigo / Cancelar solicitud
   */
  async removeFriend(req, res) {
    try {
      const { friendshipId } = req.params;
      const userId = req.user.id;

      console.log('🗑️ RemoveFriend - Friendship:', friendshipId, 'User:', userId);

      const friendship = await FriendshipModel.findByPk(friendshipId);
      
      if (!friendship) {
        return res.status(404).json({
          success: false,
          message: 'Amistad no encontrada'
        });
      }

      // Verificar que el usuario sea parte de la amistad
      if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta amistad'
        });
      }

      await friendship.destroy();

      console.log('✅ Amistad eliminada:', friendshipId);

      res.status(200).json({
        success: true,
        message: 'Amistad eliminada exitosamente'
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  _handleError(res, error) {
    console.error('❌ Error en FriendshipController:', error.message);
    console.error('Stack:', error.stack);
    
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
        message: 'Ya existe una relación entre estos usuarios'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = FriendshipController;