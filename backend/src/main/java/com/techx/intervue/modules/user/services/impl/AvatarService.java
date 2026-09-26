package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.AvatarServiceInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.UUID;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * The avatar lives in users.image in the same place as the Google photo, in the form
 * "/uploads/avatars/uuid.jpg". The server does not store the file the user sent as is: it reads out
 * the pixels and re-encodes them as JPEG, so the EXIF (which may contain GPS coordinates) and
 * anything hidden in the file are dropped.
 */
@Service
@RequiredArgsConstructor
public class AvatarService implements AvatarServiceInterface {

    static final String FOLDER = "avatars";
    static final String URL_PREFIX = "/uploads/" + FOLDER + "/";
    static final int MAX_BYTES = 2 * 1024 * 1024;

    /**
     * Block "decompression bomb" images: read the size from the header before decoding the pixels.
     */
    static final int MAX_SOURCE_SIDE = 4096;

    static final int SIZE = 512;
    private static final float JPEG_QUALITY = 0.85f;

    private static final String NOT_AN_IMAGE = "Choose a JPEG or PNG photo.";

    private final UserRepository userRepository;
    private final FileStorageServiceInterface storage;

    @Override
    @Transactional
    public UserResource setAvatar(Long userId, MultipartFile file) {
        User user = findActiveUser(userId);
        byte[] jpeg = toSquareJpeg(readUpload(file));
        String fileName = UUID.randomUUID() + ".jpg";
        storage.store(FOLDER, fileName, jpeg);

        String previous = user.getImage();
        user.setImage(URL_PREFIX + fileName);
        User saved = userRepository.saveAndFlush(user);
        // The old image is only deleted after commit; on rollback delete the new image just written
        TransactionHelper.afterCompletion(
                () -> deleteIfUploaded(previous), () -> storage.delete(FOLDER, fileName));
        return UserService.toResource(saved);
    }

    @Override
    @Transactional
    public UserResource removeAvatar(Long userId) {
        User user = findActiveUser(userId);
        String previous = user.getImage();
        user.setImage(null);
        User saved = userRepository.saveAndFlush(user);
        TransactionHelper.afterCommit(() -> deleteIfUploaded(previous));
        return UserService.toResource(saved);
    }

    /** An external link (a Google photo) is not our own file so it is not deleted. */
    private void deleteIfUploaded(String url) {
        if (url != null && url.startsWith(URL_PREFIX)) {
            storage.delete(FOLDER, url.substring(URL_PREFIX.length()));
        }
    }

    private static byte[] readUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFieldException("file", "Choose a photo to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new InvalidFieldException("file", "The photo must be 2 MB or smaller.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new InvalidFieldException("file", "The photo could not be read. Try again.");
        }
        // Trust the file content, not the Content-Type or extension sent by the browser
        if (!isJpeg(bytes) && !isPng(bytes)) {
            throw new InvalidFieldException("file", NOT_AN_IMAGE);
        }
        return bytes;
    }

    private static boolean isJpeg(byte[] b) {
        return b.length > 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        byte[] sig = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
        if (b.length < sig.length) {
            return false;
        }
        for (int i = 0; i < sig.length; i++) {
            if (b[i] != sig[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Crop a square from the middle (the FE already crops, this is a backstop), scale down to at
     * most 512px.
     */
    static byte[] toSquareJpeg(byte[] bytes) {
        BufferedImage source = decode(bytes);
        int side = Math.min(source.getWidth(), source.getHeight());
        int x = (source.getWidth() - side) / 2;
        int y = (source.getHeight() - side) / 2;
        int size = Math.min(side, SIZE);

        // JPEG has no alpha channel: the transparent part of a PNG becomes a white background
        BufferedImage square = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = square.createGraphics();
        try {
            g.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, size, size);
            g.drawImage(source, 0, 0, size, size, x, y, x + side, y + side, null);
        } finally {
            g.dispose();
        }
        return encodeJpeg(square);
    }

    private static BufferedImage decode(byte[] bytes) {
        try (ImageInputStream in =
                ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw new InvalidFieldException("file", NOT_AN_IMAGE);
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                if (reader.getWidth(0) > MAX_SOURCE_SIDE || reader.getHeight(0) > MAX_SOURCE_SIDE) {
                    throw new InvalidFieldException(
                            "file", "The photo must be at most 4096 pixels on each side.");
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof InvalidFieldException invalid) {
                throw invalid;
            }
            throw new InvalidFieldException("file", "This file is not a photo we can read.");
        }
    }

    private static byte[] encodeJpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(image, null, null), param);
        } catch (IOException e) {
            throw new IllegalStateException("Could not encode the photo", e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }

    private User findActiveUser(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new BadCredentialsException("Account not found."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        return user;
    }
}
