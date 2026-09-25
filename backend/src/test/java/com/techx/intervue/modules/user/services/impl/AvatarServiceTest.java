package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.services.impl.LocalFileStorageService;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class AvatarServiceTest {

    @TempDir Path root;

    private UserRepository userRepository;
    private AvatarService service;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        service = new AvatarService(userRepository, new LocalFileStorageService(root.toString()));
        user =
                User.builder()
                        .id(7L)
                        .email("an@example.com")
                        .fullName("An")
                        .role(RoleType.CUSTOMER)
                        .status(UserStatus.ACTIVE)
                        .build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static byte[] image(String format, int width, int height) throws IOException {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var g = img.createGraphics();
        g.setColor(Color.GREEN);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    private static MockMultipartFile file(byte[] bytes, String type) {
        return new MockMultipartFile("file", "photo", type, bytes);
    }

    private Path storedFile(String url) {
        return root.resolve("avatars").resolve(url.substring(url.lastIndexOf('/') + 1));
    }

    private long storedCount() throws IOException {
        Path dir = root.resolve("avatars");
        if (!Files.exists(dir)) return 0;
        try (Stream<Path> files = Files.list(dir)) {
            return files.count();
        }
    }

    @Test
    void savesAPngAsA512SquareJpegAndReturnsItsUrl() throws IOException {
        UserResource result = service.setAvatar(7L, file(image("png", 800, 600), "image/png"));

        assertThat(result.avatarUrl()).matches("/uploads/avatars/[0-9a-f-]{36}\\.jpg");
        assertThat(user.getImage()).isEqualTo(result.avatarUrl());
        byte[] saved = Files.readAllBytes(storedFile(result.avatarUrl()));
        assertThat(saved).startsWith((byte) 0xFF, (byte) 0xD8, (byte) 0xFF);
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(saved));
        assertThat(img.getWidth()).isEqualTo(512);
        assertThat(img.getHeight()).isEqualTo(512);
    }

    @Test
    void keepsASmallPhotoAtItsOwnSize() throws IOException {
        UserResource result = service.setAvatar(7L, file(image("jpg", 200, 300), "image/jpeg"));

        BufferedImage img = ImageIO.read(storedFile(result.avatarUrl()).toFile());
        assertThat(img.getWidth()).isEqualTo(200);
        assertThat(img.getHeight()).isEqualTo(200);
    }

    @Test
    void refusesAFileThatOnlyClaimsToBeAnImage() {
        byte[] text = "<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> service.setAvatar(7L, file(text, "image/png")))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("file");
        assertThat(user.getImage()).isNull();
    }

    @Test
    void refusesAJpegHeaderWithNothingReadableBehindIt() {
        byte[] broken = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 1, 2, 3, 4};

        assertThatThrownBy(() -> service.setAvatar(7L, file(broken, "image/jpeg")))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void refusesAnEmptyOrOversizedFile() {
        assertThatThrownBy(() -> service.setAvatar(7L, file(new byte[0], "image/png")))
                .isInstanceOf(InvalidFieldException.class);

        byte[] big = new byte[AvatarService.MAX_BYTES + 1];
        big[0] = (byte) 0xFF;
        big[1] = (byte) 0xD8;
        big[2] = (byte) 0xFF;
        assertThatThrownBy(() -> service.setAvatar(7L, file(big, "image/jpeg")))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessageContaining("2 MB");
    }

    @Test
    void refusesAHugeImage() throws IOException {
        byte[] wide = image("png", AvatarService.MAX_SOURCE_SIDE + 1, 10);

        assertThatThrownBy(() -> service.setAvatar(7L, file(wide, "image/png")))
                .isInstanceOf(InvalidFieldException.class);
    }

    @Test
    void replacingAPhotoDeletesTheOldUpload() throws IOException {
        String first = service.setAvatar(7L, file(image("png", 100, 100), "image/png")).avatarUrl();
        String second =
                service.setAvatar(7L, file(image("png", 100, 100), "image/png")).avatarUrl();

        assertThat(second).isNotEqualTo(first);
        assertThat(Files.exists(storedFile(first))).isFalse();
        assertThat(Files.exists(storedFile(second))).isTrue();
        assertThat(storedCount()).isEqualTo(1);
    }

    @Test
    void replacingAGooglePictureLeavesNothingBehind() throws IOException {
        user.setImage("https://lh3.googleusercontent.com/a/photo");

        String url = service.setAvatar(7L, file(image("png", 100, 100), "image/png")).avatarUrl();

        assertThat(user.getImage()).isEqualTo(url);
        assertThat(storedCount()).isEqualTo(1);
    }

    @Test
    void removingClearsThePhotoAndDeletesTheFile() throws IOException {
        String url = service.setAvatar(7L, file(image("png", 100, 100), "image/png")).avatarUrl();

        UserResource result = service.removeAvatar(7L);

        assertThat(result.avatarUrl()).isNull();
        assertThat(user.getImage()).isNull();
        assertThat(Files.exists(storedFile(url))).isFalse();
    }
}
