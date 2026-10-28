export function welcomeTextTime() {
    const gioHienTai = new Date().getHours(); // Lấy giờ từ 0 - 23
    let loiChao = "";

    if (gioHienTai >= 5 && gioHienTai < 12) {
        loiChao = "Chào buổi sáng";
    } else if (gioHienTai >= 12 && gioHienTai < 18) {
        loiChao = "Chào buổi chiều";
    } else if (gioHienTai >= 18 && gioHienTai < 22) {
        loiChao = "Chào buổi tối";
    } else {
        loiChao = "Chào buổi tối";
    }

    return loiChao;
}

export const getInitials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map(part => part[0]?.toLocaleUpperCase() ?? '')
        .join('');