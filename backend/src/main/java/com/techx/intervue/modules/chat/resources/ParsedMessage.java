package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.ChatIntent;

/**
 * Kết quả phân loại một tin nhắn.
 *
 * @param normalized câu đã bỏ dấu, dùng để so khớp tên chợ / stall
 * @param keyword phần còn lại sau khi bỏ từ kích hoạt và stopword, dùng để tìm sản phẩm
 * @param dayOfWeek 0 = Chủ nhật … 6 = Thứ 7 (khớp cột day_of_week), null nếu câu không nhắc tới
 */
public record ParsedMessage(
        ChatIntent intent, String normalized, String keyword, Integer dayOfWeek) {}
