import axios from 'axios';
import authService from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const INVITATION_URL = `${API_URL}/invitations`;

function getAuthHeaders() {
    const user = authService.getCurrentUser();
    return {
        headers: { Authorization: `Bearer ${user?.token}` }
    };
}

const invitationService = {
    // 创建邀请码
    async createInvitation(expiresInHours = 24, maxUses = 1) {
        const response = await axios.post(
            INVITATION_URL,
            { expiresInHours, maxUses },
            getAuthHeaders()
        );
        return response.data;
    },

    // 获取所有邀请码
    async listInvitations() {
        const response = await axios.get(INVITATION_URL, getAuthHeaders());
        return response.data;
    },

    // 删除邀请码
    async deleteInvitation(code) {
        const response = await axios.delete(
            `${INVITATION_URL}/${code}`,
            getAuthHeaders()
        );
        return response.data;
    }
};

export default invitationService;
