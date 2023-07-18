# super-strava-boy

Visualising my commutes to work over the course of the year: [geotho.github.io/super-strava-boy](https://geotho.github.io/super-strava-boy)

Inspired by the death replay at the end of [Super Meat Boy levels](https://www.youtube.com/watch?v=mbSDiFihwXs).

Written natively in ES6 so if you aren't using the latest Chrome it probably won't work.

## Video

[super-strava-boy-vid.webm](https://github.com/geotho/super-strava-boy/assets/2182503/c3497465-ba26-4c00-97f3-7ddfe3e18dd6)

Note to self: here's the `ffmpeg` command I used to convert the video to webm:

```sh
ffmpeg -i in.mov \
-vf "setpts=2.0*PTS,scale=-1:720,hqdn3d" \
-ss 00:00:03.01 \
-to 00:00:10.43 \
-c:v libvpx-vp9 \
-b:v 2M \
-crf 4 \
-threads 8 \
-c:a libvorbis \
out.webm
```
