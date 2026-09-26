package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.ChatIntent;

/**
 * The result of classifying one message.
 *
 * @param normalized the sentence with diacritics removed, used to match market / stall names
 * @param keyword what remains after removing trigger words and stopwords, used to search products
 * @param dayOfWeek 0 = Sunday … 6 = Saturday (matches the day_of_week column), null if the sentence
 *     does not mention one
 */
public record ParsedMessage(
        ChatIntent intent, String normalized, String keyword, Integer dayOfWeek) {}
