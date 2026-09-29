package com.techx.intervue.modules.chat.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.chat.services.impl.UserGuideIndex.Section;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class UserGuideIndexTest {

    private final UserGuideIndex guide = new UserGuideIndex();

    @Test
    void loadsEverySectionOfTheShippedGuide() {
        assertThat(guide.size()).isGreaterThan(20);
    }

    @ParameterizedTest
    @CsvSource({
        "quên mật khẩu, Quên mật khẩu",
        "quen mat khau, Quên mật khẩu",
        "huỷ đơn hàng, Huỷ đơn hàng",
        "sửa đơn giảm số lượng, Sửa đơn hàng",
        "thanh toán tiền mặt chuyển khoản, Thanh toán",
        "đăng ký bán hàng farmer, Đăng ký bán hàng (trở thành Farmer)",
        "đổi ngôn ngữ giao diện tối, 'Đổi ngôn ngữ, giao diện sáng/tối, tiền tệ'",
        "đánh giá gian hàng sao, Đánh giá gian hàng và sản phẩm",
        "không nhận được mã xác nhận email đăng ký, Không nhận được mã xác nhận email",
        "khong nhan duoc ma 6 so, Không nhận được mã xác nhận email",
    })
    void findsTheAnsweringSectionInTheTopThree(String query, String expectedTitle) {
        assertThat(guide.search(query, 3)).extracting(Section::title).contains(expectedTitle);
    }

    @Test
    void queryOfOnlyStopwordsOrUnknownWordsFindsNothing() {
        assertThat(guide.search("là của và", 3)).isEmpty();
        assertThat(guide.search("xyzzy", 3)).isEmpty();
    }

    @Test
    void splitsOneSectionPerSecondLevelHeadingAndSkipsTheLead() {
        List<Section> sections =
                UserGuideIndex.split(
                        """
                        # Guide
                        Intro that only introduces the file.

                        ## First
                        Body one.

                        ## Second
                        Body two.
                        """);

        assertThat(sections)
                .containsExactly(
                        new Section("Guide", "First", "Body one."),
                        new Section("Guide", "Second", "Body two."));
    }
}
