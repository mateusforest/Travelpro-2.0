# TravelPro — visible ambient hero

## Style Prompt
Preserve the existing photograph of Lençóis Maranhenses: turquoise lagoons, cream dunes at golden hour, and the small traveler in terracotta at the right. The user requested readily perceptible motion while retaining an elegant background for the existing TravelPro interface. The source photograph remains byte-for-byte unchanged.

## Colors
- #171B1D — existing charcoal fallback canvas.
- #F4F1E9 — existing warm paper and natural sand reference.
- #FF602E — existing interface accent, never painted into the photograph.

## Typography
No typography or logos in the rendered asset. The webpage owns its Manrope and DM Sans typography.

## Motion
- 1920 × 1080, 10 seconds, 30 fps, silent seamless loop.
- Single photograph. Source resolution 1672 × 941; export is an upscale.
- Zoom range 1.04 to 1.10: six percentage points, approximately 5.77% relative magnification.
- Pan range x +8 to −10 px and y −4 to +6 px at output resolution.
- Start halfway into the push at scale 1.07, x −1, y +1. Move to the closest framing in 2.5 seconds using sine.out, reverse through the widest framing over 5 seconds using sine.inOut, and return to the initial framing over 2.5 seconds using sine.in.
- This is one continuous sinusoidal framing cycle. At the loop seam, position and velocity match. There is no intentional hold and visible movement begins immediately.
- The small amount of overscan keeps all image edges beyond the video frame throughout.
- Deterministic, synchronous, paused GSAP timeline registered as travelpro-ambient. The consuming video element owns looping and play/pause.

## What NOT to Do
- No generated imagery or edits to the supplied photograph.
- No text, logos, particles, filters, flares, flash, artificial sharpening or color changes.
- Do not imply real motion by the traveler or landscape; this is a framing animation of a still photograph.
- No infinite timeline repeats, asynchronous timeline construction, fades or loop jumps.
- Do not edit or publish the webpage from this asset folder.
